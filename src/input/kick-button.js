import { CONFIG } from '../config.js';

const HIT_SLACK = 1.2;

/** Round on-screen button; each press yields one kick on the next read. */
export class KickButton {
  constructor(center) {
    this.center = center;
    this.priority = 1;
    this.pressed = false;
    this.pending = false;
  }

  claims(x, y) {
    const [cx, cy] = this.center();
    return Math.hypot(x - cx, y - cy) <= CONFIG.touch.kickRadius * HIT_SLACK;
  }

  down() {
    this.pressed = true;
    this.pending = true;
  }

  move() {}

  up() { this.pressed = false; }

  read() {
    const kick = this.pending;
    this.pending = false;
    return { x: 0, y: 0, kick };
  }

  draw(ctx) {
    const [cx, cy] = this.center(), r = CONFIG.touch.kickRadius;
    ctx.globalAlpha = this.pressed ? 0.7 : 0.4;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0f172a';
    ctx.font = `800 ${Math.round(r * 0.5)}px 'Baloo 2', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(CONFIG.text.kick, cx, cy + 2);
  }
}
