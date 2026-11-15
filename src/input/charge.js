import { CONFIG } from '../config.js';

const MS_PER_SECOND = 1000;

/** Measures how long the kick control is held, as a shot power level from 0 to 1. */
export class Charge {
  constructor(now = () => performance.now()) {
    this.now = now;
    this.startedAt = null;
  }

  get active() { return this.startedAt !== null; }

  get level() {
    if (!this.active) return 0;
    return Math.min(1, (this.now() - this.startedAt) / (CONFIG.kick.chargeTime * MS_PER_SECOND));
  }

  press() { this.startedAt = this.now(); }

  /** Ends the hold and returns the level it reached. */
  release() {
    const level = this.level;
    this.startedAt = null;
    return level;
  }
}
