import { unit } from '../core/utils.js';
import { Charge } from './charge.js';
import { NO_INPUT } from './input.js';

/** Keyboard controls for testing on a computer: hold the kick key to charge, release to shoot. */
export class KeyboardSource {
  constructor(map, target = globalThis, charge = new Charge()) {
    this.map = map;
    this.target = target;
    this.held = new Set();
    this.charge = charge;
    this.pendingKick = null;
    this.pendingDash = false;
    const codes = Object.values(map);
    this.onDown = (e) => {
      if (!codes.includes(e.code)) return;
      e.preventDefault();
      if (e.code === map.kick && !e.repeat) this.charge.press();
      if (e.code === map.dash && !e.repeat) this.pendingDash = true;
      this.held.add(e.code);
    };
    this.onUp = (e) => {
      if (e.code === map.kick && this.charge.active) this.pendingKick = this.charge.release();
      this.held.delete(e.code);
    };
    target.addEventListener('keydown', this.onDown);
    target.addEventListener('keyup', this.onUp);
  }

  read() {
    const m = this.map, on = (code) => (this.held.has(code) ? 1 : 0);
    const [x, y] = unit(on(m.right) - on(m.left), on(m.down) - on(m.up));
    const input = { ...NO_INPUT, x, y, kick: this.pendingKick, dash: this.pendingDash };
    this.pendingKick = null;
    this.pendingDash = false;
    return input;
  }

  dispose() {
    this.target.removeEventListener('keydown', this.onDown);
    this.target.removeEventListener('keyup', this.onUp);
  }
}
