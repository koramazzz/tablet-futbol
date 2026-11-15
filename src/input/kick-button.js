import { CONFIG } from '../config.js';

/** A touch zone marked by a round button; each press anywhere in the zone yields one kick on the next read. */
export class KickButton {
  constructor(zone, center) {
    this.zone = zone;
    this.center = center;
    this.pressed = false;
    this.pending = false;
  }

  claims(x, y) { return this.zone(x, y); }

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
