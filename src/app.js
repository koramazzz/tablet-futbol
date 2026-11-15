import { CONFIG } from './config.js';
import { Sfx } from './audio/sfx.js';
import { EffectWatcher } from './audio/effect-watcher.js';
import { Controller } from './input/controller.js';
import { KeyboardSource } from './input/keyboard-source.js';
import { PointerRouter } from './input/pointer-router.js';
import { buildTouchPads } from './input/layouts.js';
import { isNetworkAvailable, PeerLink } from './net/peer-link.js';
import { Renderer } from './render/renderer.js';
import { Smoother } from './render/smoother.js';
import { GuestSession } from './sessions/guest-session.js';
import { HostSession } from './sessions/host-session.js';
import { LocalSession } from './sessions/local-session.js';
import { UI } from './ui/ui.js';

const MS_PER_SECOND = 1000;

/** Wires screens, sessions, input, sound and rendering into one game loop. */
export class App {
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.router = new PointerRouter(canvas);
    this.sfx = new Sfx();
    this.effects = new EffectWatcher(this.sfx);
    this.smoother = new Smoother(Infinity);
    this.session = null;
    this.view = {};
    this.paused = false;
    this.endShown = false;
    this.ui = new UI(this);
    this.ui.setNetwork(isNetworkAvailable());
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  onGesture() {
    this.sfx.unlock();
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }

  controllerFor(pad, keyMaps, invert = false) {
    return new Controller([...pad, ...keyMaps.map(m => new KeyboardSource(m))], invert);
  }

  begin(session) {
    this.endSession();
    this.session = session;
    this.renderer.flip = session.flip;
    this.smoother = new Smoother(session instanceof GuestSession ? CONFIG.view.smoothing : Infinity);
    this.effects.reset();
    this.router.setControls(session.controllers.flatMap(c => c.touchControls));
    document.body.classList.add('playing');
    this.ui.show(null);
  }

  startLocal() {
    const pads = buildTouchPads('local', this.renderer);
    const controllers = pads.map((pad, i) => this.controllerFor(pad, [CONFIG.keys[i]]));
    this.begin(new LocalSession(this.ui.readProfile(), controllers));
  }

  async startHost() {
    this.ui.showConnecting(CONFIG.text.creating);
    try {
      const { link, code } = await PeerLink.host();
      if (this.ui.current !== 'connect') { link.close(); return; }
      const [pad] = buildTouchPads('online', this.renderer);
      this.begin(new HostSession(link, this.ui.readProfile(), this.controllerFor(pad, CONFIG.keys)));
      this.ui.showWait(code);
    } catch {
      this.ui.showError(CONFIG.text.hostFailed);
    }
  }

  async startGuest(code) {
    this.ui.showConnecting(CONFIG.text.connecting);
    try {
      const link = await PeerLink.join(code);
      if (this.ui.current !== 'connect') { link.close(); return; }
      const [pad] = buildTouchPads('online', this.renderer);
      this.begin(new GuestSession(link, this.ui.readProfile(), this.controllerFor(pad, CONFIG.keys, true)));
      this.ui.showConnecting(CONFIG.text.starting);
    } catch (err) {
      this.ui.showError(err.reason === 'not-found' ? CONFIG.text.notFound : CONFIG.text.joinFailed);
    }
  }

  setPaused(paused) { this.paused = paused; }

  rematch() { this.session?.rematch(); }

  endSession() {
    this.session?.dispose();
    this.session = null;
    this.view = {};
    this.paused = false;
    this.endShown = false;
    this.router.setControls([]);
    this.renderer.flip = false;
    this.smoother.reset();
    document.body.classList.remove('playing');
  }

  toMenu() {
    this.endSession();
    this.ui.buildMenu();
    this.ui.show('menu');
  }

  syncScreens(view) {
    if (view.error) {
      this.endSession();
      this.ui.showError(view.error);
      return;
    }
    const { state } = view, ui = this.ui;
    if (!state) return;
    if (ui.current === 'wait' || ui.current === 'connect') ui.show(null);
    if (state.ph === 'end' && !this.endShown) {
      this.endShown = true;
      ui.showEnd(state, this.session instanceof GuestSession);
    } else if (state.ph !== 'end' && this.endShown) {
      this.endShown = false;
      ui.show(null);
    }
  }

  loop(now) {
    const dt = Math.min(CONFIG.maxFrameDt, Math.max(0, (now - this.last) / MS_PER_SECOND));
    this.last = now;
    if (this.session && !(this.paused && this.session.pausable)) {
      this.view = this.session.frame(dt);
      this.syncScreens(this.view);
    }
    const state = this.session ? this.view.state : null;
    const playing = this.session && !this.ui.current;
    this.effects.observe(state);
    this.renderer.draw({
      state: this.smoother.apply(state, dt),
      myTeam: this.session?.myTeam ?? null,
      notice: playing ? this.view.notice : null,
      controls: playing ? this.router.controls : [],
    });
    requestAnimationFrame((t) => this.loop(t));
  }
}
