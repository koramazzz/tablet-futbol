import { CONFIG } from '../config.js';

const totalGoals = (s) => s.sc[0] + s.sc[1];

/** Plays sounds by comparing consecutive snapshots, so host and guest sound the same. */
export class EffectWatcher {
  constructor(sfx) {
    this.sfx = sfx;
    this.prev = null;
  }

  observe(s) {
    const p = this.prev;
    this.prev = s;
    if (!s || !p) return;
    if (s.kc > p.kc) this.sfx.kick();
    if (totalGoals(s) > totalGoals(p)) this.sfx.goal();
    if (s.ph !== p.ph && s.ph === 'play') this.sfx.whistle();
    if (s.ph !== p.ph && s.ph === 'end') this.sfx.whistle(CONFIG.sound.endWhistles);
  }

  reset() { this.prev = null; }
}
