import { CONFIG } from '../config.js';

const POSITION_FIELDS = 2;

/**
 * Eases displayed positions toward the latest snapshot (used by the guest,
 * whose snapshots arrive ~30×/s). With rate = Infinity it passes snapshots through.
 */
export class Smoother {
  constructor(rate) {
    this.rate = rate;
    this.cur = null;
  }

  reset() { this.cur = null; }

  apply(target, dt) {
    if (!target) return this.cur;
    if (!this.cur || !Number.isFinite(this.rate)) {
      this.cur = target;
      return target;
    }
    const a = 1 - Math.exp(-this.rate * dt), c = this.cur;
    const blend = (from, to) => (Math.hypot(to[0] - from[0], to[1] - from[1]) > CONFIG.view.snapDistance
      ? to
      : to.map((v, i) => (i < POSITION_FIELDS ? from[i] + (v - from[i]) * a : v)));
    this.cur = {
      ...target,
      b: blend(c.b, target.b),
      p: target.p.map((q, i) => blend(c.p[i], q)),
      g: target.g.map((q, i) => blend(c.g[i], q)),
    };
    return this.cur;
  }
}
