import { CONFIG } from '../config.js';
import { Charge } from './charge.js';

const RING = { gap: 8, width: 8, color: '#fde047' };
const START_ANGLE = -Math.PI / 2;

/**
 * A touch zone marked by a round button. Holding anywhere in the zone charges the shot
 * and releasing yields one kick, with the charged power, on the next read.
 */
export class KickButton {
  constructor(zone, center, charge = new Charge()) {
    this.zone = zone;
    this.center = center;
    this.charge = charge;
    this.pending = null;
  }

  claims(x, y) { return !this.charge.active && this.zone(x, y); }

  down() { this.charge.press(); }

  move() {}

  up() {
    if (this.charge.active) this.pending = this.charge.release();
  }

  read() {
    const kick = this.pending;
    this.pending = null;
    return { x: 0, y: 0, kick };
  }

  draw(ctx) {
    const [cx, cy] = this.center(), r = CONFIG.touch.kickRadius;
    ctx.globalAlpha = this.charge.active ? 0.7 : 0.4;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    if (this.charge.active) {
      ctx.strokeStyle = RING.color;
      ctx.lineWidth = RING.width;
      ctx.beginPath(); ctx.arc(cx, cy, r + RING.gap, START_ANGLE, START_ANGLE + this.charge.level * Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#0f172a';
    ctx.font = `800 ${Math.round(r * 0.5)}px 'Baloo 2', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(CONFIG.text.kick, cx, cy + 2);
  }
}
