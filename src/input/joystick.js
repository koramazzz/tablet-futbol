import { CONFIG } from '../config.js';
import { clampMagnitude } from '../core/utils.js';
import { NO_INPUT } from './input.js';

/** Floating thumbstick: appears where the finger lands inside its zone. */
export class Joystick {
  constructor(zone, home) {
    this.zone = zone;
    this.home = home;
    this.reset();
  }

  reset() {
    this.active = false;
    this.origin = null;
    this.vec = [0, 0];
  }

  claims(x, y) { return !this.active && this.zone(x, y); }

  down(x, y) {
    this.active = true;
    this.origin = [x, y];
    this.vec = [0, 0];
  }

  move(x, y) {
    const { joyRadius, deadzone } = CONFIG.touch;
    const [vx, vy] = clampMagnitude((x - this.origin[0]) / joyRadius, (y - this.origin[1]) / joyRadius);
    this.vec = Math.hypot(vx, vy) < deadzone ? [0, 0] : [vx, vy];
  }

  up() { this.reset(); }

  read() { return { ...NO_INPUT, x: this.vec[0], y: this.vec[1] }; }

  draw(ctx) {
    const { joyRadius, knobRadius } = CONFIG.touch;
    const [cx, cy] = this.origin || this.home();
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = this.active ? 0.35 : 0.18;
    ctx.beginPath(); ctx.arc(cx, cy, joyRadius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = this.active ? 0.85 : 0.4;
    ctx.beginPath(); ctx.arc(cx + this.vec[0] * joyRadius, cy + this.vec[1] * joyRadius, knobRadius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
