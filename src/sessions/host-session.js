import { CONFIG } from '../config.js';
import { Match } from '../core/match.js';
import { clamp, clampMagnitude, cleanName, finiteOr, otherColor, safeColor } from '../core/utils.js';
import { Session } from './session.js';

/** Reads the guest's latest message as a match input. Untrusted, so everything is clamped. */
export function guestInput(msg, kicked) {
  const axis = (v) => clamp(finiteOr(v, 0), -1, 1);
  const [x, y] = clampMagnitude(axis(msg.ix), axis(msg.iy));
  return { x, y, kick: kicked ? clamp(finiteOr(msg.kp, 1), 0, 1) : null };
}

/** Picks the guest's team identity, never sharing the host's colour. */
export function guestTeam(msg, hostColor) {
  const color = safeColor(msg.color, otherColor(hostColor));
  return { name: cleanName(msg.name, CONFIG.defaultNames[1]), color: color === hostColor ? otherColor(hostColor) : color };
}

/** Runs the authoritative match and streams snapshots to the guest. Host plays team 0. */
export class HostSession extends Session {
  constructor(link, profile, controller) {
    super({ controllers: [controller], link, myTeam: 0 });
    this.profile = profile;
    this.match = null;
    this.seenConnection = 0;
    this.lastKick = null;
    this.lastRematch = null;
  }

  latestGuestMessage() {
    const msg = this.link.isOpen ? this.link.latest : null;
    if (!msg || msg.pv !== CONFIG.net.protocol) return null;
    if (this.link.connectionId !== this.seenConnection) {
      this.seenConnection = this.link.connectionId;
      this.lastKick = msg.k;
      this.lastRematch = msg.rm;
    }
    return msg;
  }

  frame(dt) {
    const msg = this.latestGuestMessage();
    if (!msg) return this.match ? { state: this.match.snapshot(), notice: CONFIG.text.waitingGuest } : { waiting: true };

    this.match ??= new Match([this.profile, guestTeam(msg, this.profile.color)], this.profile.minutes);
    const kicked = msg.k !== this.lastKick;
    this.lastKick = msg.k;
    if (msg.rm !== this.lastRematch) {
      this.lastRematch = msg.rm;
      if (this.match.phase === 'end') this.match.restart();
    }
    this.match.advance(dt, [this.controllers[0].read(), guestInput(msg, kicked)]);
    const state = this.match.snapshot();
    this.link.send(state);
    return { state };
  }

  rematch() { this.match?.restart(); }
}
