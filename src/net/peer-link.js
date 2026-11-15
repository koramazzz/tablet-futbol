import { CONFIG } from '../config.js';
import { randomCode } from '../core/utils.js';

const peerId = (code) => CONFIG.net.idPrefix + code;
const MS_PER_SECOND = 1000;

export const isNetworkAvailable = () => typeof globalThis.Peer === 'function';

/** Error with a machine-readable reason ('not-found', 'failed'). */
export class LinkError extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

/**
 * One peer-to-peer data channel between two tablets (PeerJS / WebRTC).
 * Each side only keeps the latest message from the other side: every message is
 * absolute state, so a dropped or throttled message is never a problem.
 */
export class PeerLink {
  constructor(peer) {
    this.peer = peer;
    this.conn = null;
    this.latest = null;
    this.connectionId = 0;
    this.lastSent = 0;
  }

  /** Opens a room; resolves with { link, code }. Retries with a new code if one is taken. */
  static async host(attempt = 1) {
    const code = randomCode();
    try {
      const link = await PeerLink.openPeer(peerId(code));
      link.peer.on('connection', (conn) => link.accept(conn));
      return { link, code };
    } catch (err) {
      if (err.type === 'unavailable-id' && attempt < CONFIG.net.hostAttempts) return PeerLink.host(attempt + 1);
      throw new LinkError('failed');
    }
  }

  /** Joins the room with the given code; resolves once the channel is open. */
  static async join(code) {
    let link;
    try { link = await PeerLink.openPeer(); } catch { throw new LinkError('failed'); }
    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = () => { const first = !settled; settled = true; clearTimeout(timer); return first; };
      const fail = (reason) => { if (settle()) { link.close(); reject(new LinkError(reason)); } };
      const timer = setTimeout(() => fail('not-found'), CONFIG.net.joinTimeout * MS_PER_SECOND);
      link.peer.on('error', (err) => fail(err.type === 'peer-unavailable' ? 'not-found' : 'failed'));
      const conn = link.peer.connect(peerId(code), { reliable: true });
      conn.on('open', () => { if (settle()) { link.accept(conn); resolve(link); } });
    });
  }

  static openPeer(id) {
    return new Promise((resolve, reject) => {
      const peer = id ? new globalThis.Peer(id) : new globalThis.Peer();
      peer.once('open', () => resolve(new PeerLink(peer)));
      peer.once('error', (err) => { peer.destroy(); reject(err); });
    });
  }

  /** Keeps one connection; a newer one (e.g. the guest reloading) replaces the old. */
  accept(conn) {
    if (this.conn && this.conn !== conn) this.conn.close();
    this.conn = conn;
    this.latest = null;
    this.connectionId++;
    conn.on('data', (data) => { if (this.conn === conn) this.latest = data; });
    conn.on('close', () => { if (this.conn === conn) { this.conn = null; this.latest = null; } });
  }

  get isOpen() { return !!this.conn && this.conn.open; }

  /** Sends at most CONFIG.net.sendRate messages per second. */
  send(message, now = performance.now()) {
    if (!this.isOpen || now - this.lastSent < MS_PER_SECOND / CONFIG.net.sendRate) return;
    this.lastSent = now;
    this.conn.send(message);
  }

  close() { this.peer.destroy(); }
}
