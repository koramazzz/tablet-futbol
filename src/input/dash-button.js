import { CONFIG } from '../config.js';
import { NO_INPUT } from './input.js';
import { drawRoundButton } from './round-button.js';

/** Round on-screen button; each press yields one dash on the next read. */
export class DashButton {
  constructor(center) {
    this.center = center;
    this.pressed = false;
    this.pending = false;
  }

  contains(x, y) {
    const [cx, cy] = this.center();
    return Math.hypot(x - cx, y - cy) <= CONFIG.touch.dashRadius;
  }

  claims(x, y) { return !this.pressed && this.contains(x, y); }

  down() {
    this.pressed = true;
    this.pending = true;
  }

  move() {}

  up() { this.pressed = false; }

  read() {
    const dash = this.pending;
    this.pending = false;
    return { ...NO_INPUT, dash };
  }

  draw(ctx) {
    const [cx, cy] = this.center();
    drawRoundButton(ctx, { cx, cy, r: CONFIG.touch.dashRadius, label: CONFIG.text.dash, pressed: this.pressed });
  }
}
