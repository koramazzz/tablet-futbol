import { CONFIG } from '../config.js';

/** Screen-space confetti bursts for goal celebrations. `random` is injectable for tests. */
export class Confetti {
  constructor(random = Math.random) {
    this.random = random;
    this.pieces = [];
  }

  /** Throws confetti up from the point (x, y) in the given colour plus the configured extras. */
  burst(x, y, color) {
    const cfg = CONFIG.confetti, colors = [color, ...cfg.extraColors];
    for (let i = 0; i < cfg.count; i++) {
      const angle = -Math.PI * this.random();
      const speed = cfg.minSpeed + (cfg.maxSpeed - cfg.minSpeed) * this.random();
      this.pieces.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        age: 0, spin: this.random() * Math.PI, color: colors[i % colors.length],
      });
    }
  }

  step(dt) {
    const cfg = CONFIG.confetti;
    for (const p of this.pieces) {
      p.vy += cfg.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.age += dt;
    }
    this.pieces = this.pieces.filter(p => p.age < cfg.life);
  }

  draw(ctx) {
    const { size, life } = CONFIG.confetti;
    for (const p of this.pieces) {
      ctx.save();
      ctx.globalAlpha = 1 - p.age / life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin + p.age * Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(-size / 2, -size / 4, size, size / 2);
      ctx.restore();
    }
  }

  clear() { this.pieces = []; }
}
