import { CONFIG } from '../config.js';

const totalGoals = (s) => s.sc[0] + s.sc[1];

/**
 * Triggers effects by comparing consecutive snapshots, so host and guest get the same ones.
 * `handlers` is { kick(), goal(state), whistle(times) }.
 */
export class EffectWatcher {
  constructor(handlers) {
    this.handlers = handlers;
    this.prev = null;
  }

  observe(s) {
    const p = this.prev;
    this.prev = s;
    if (!s || !p) return;
    if (s.kc > p.kc) this.handlers.kick();
    if (totalGoals(s) > totalGoals(p)) this.handlers.goal(s);
    if (s.ph !== p.ph && s.ph === 'play') this.handlers.whistle();
    if (s.ph !== p.ph && s.ph === 'end') this.handlers.whistle(CONFIG.sound.endWhistles);
  }

  reset() { this.prev = null; }
}
