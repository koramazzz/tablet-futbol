import { CONFIG } from '../config.js';
import { formatClock } from '../core/utils.js';

const FONT = "'Baloo 2', sans-serif";
const HUD = { maxWidth: 640, sideGap: 130, top: 6, radius: 18, chipR: 11, nameSize: 20, scoreSize: 30, clockSize: 15 };
const BANNER = { size: 24, padding: 40, height: 56, radius: 18 };
const BIG_TEXT_RATIO = 0.22;

/** Draws pitch, bodies, HUD and controls. With `flip` the pitch is rotated 180° (guest view). */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.flip = false;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, CONFIG.view.maxDpr);
    this.W = innerWidth;
    this.H = innerHeight;
    this.canvas.width = this.W * dpr;
    this.canvas.height = this.H * dpr;
    this.canvas.style.width = `${this.W}px`;
    this.canvas.style.height = `${this.H}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const f = CONFIG.field, hud = CONFIG.view.hudHeight;
    const totalW = f.w + 2 * (f.border + f.goalDepth), totalH = f.h + 2 * f.border;
    this.s = Math.min(this.W / totalW, (this.H - hud) / totalH);
    this.ox = (this.W - f.w * this.s) / 2;
    this.oy = hud + (this.H - hud - f.h * this.s) / 2;
  }

  pt(x, y) {
    const f = CONFIG.field;
    if (this.flip) { x = f.w - x; y = f.h - y; }
    return [this.ox + x * this.s, this.oy + y * this.s];
  }

  rect(x, y, w, h) {
    const [ax, ay] = this.pt(x, y), [bx, by] = this.pt(x + w, y + h);
    return [Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay)];
  }

  line(x1, y1, x2, y2) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(...this.pt(x1, y1));
    ctx.lineTo(...this.pt(x2, y2));
    ctx.stroke();
  }

  font(size) { this.ctx.font = `800 ${Math.round(size)}px ${FONT}`; }

  draw({ state, myTeam, notice, controls }) {
    const ctx = this.ctx;
    ctx.fillStyle = CONFIG.pitchColors.stands;
    ctx.fillRect(0, 0, this.W, this.H);
    this.drawPitch(state ? state.tm.map(t => t.c) : CONFIG.colors.slice(0, 2));
    if (state) {
      state.g.forEach((g, t) => this.drawKeeper(g, state.tm[t].c));
      state.p.forEach((p, t) => this.drawPlayer(p, state.tm[t], t === myTeam));
      this.drawBall(state.b);
      this.drawHud(state);
      this.drawPhase(state);
    }
    if (notice) this.drawBanner(notice);
    controls.forEach(c => c.draw(ctx));
  }

  drawPitch(goalColors) {
    const ctx = this.ctx, f = CONFIG.field, col = CONFIG.pitchColors;
    ctx.fillStyle = col.grassB;
    ctx.fillRect(...this.rect(-f.border, -f.border, f.w + 2 * f.border, f.h + 2 * f.border));
    const stripeW = f.w / f.stripes;
    for (let i = 0; i < f.stripes; i++) {
      ctx.fillStyle = i % 2 ? col.grassA : col.grassB;
      ctx.fillRect(...this.rect(i * stripeW, 0, stripeW, f.h));
    }
    goalColors.forEach((c, team) => this.drawGoal(team, c));
    ctx.strokeStyle = col.line;
    ctx.lineWidth = Math.max(2, 4 * this.s);
    ctx.strokeRect(...this.rect(0, 0, f.w, f.h));
    this.line(f.w / 2, 0, f.w / 2, f.h);
    const [cx, cy] = this.pt(f.w / 2, f.h / 2);
    ctx.beginPath(); ctx.arc(cx, cy, f.circleR * this.s, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = col.line;
    ctx.beginPath(); ctx.arc(cx, cy, 5 * this.s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeRect(...this.rect(0, f.h / 2 - f.boxH / 2, f.boxW, f.boxH));
    ctx.strokeRect(...this.rect(f.w - f.boxW, f.h / 2 - f.boxH / 2, f.boxW, f.boxH));
  }

  drawGoal(team, color) {
    const ctx = this.ctx, f = CONFIG.field;
    const x0 = team === 0 ? -f.goalDepth : f.w, y0 = f.h / 2 - f.goalH / 2;
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = color;
    ctx.fillRect(...this.rect(x0, y0, f.goalDepth, f.goalH));
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    for (let x = x0; x <= x0 + f.goalDepth; x += f.netCell) this.line(x, y0, x, y0 + f.goalH);
    for (let y = y0; y <= y0 + f.goalH; y += f.netCell) this.line(x0, y, x0 + f.goalDepth, y);
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(3, 6 * this.s);
    ctx.strokeRect(...this.rect(x0, y0, f.goalDepth, f.goalH));
  }

  shadow(sx, sy, r) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(sx + r * 0.15, sy + r * 0.45, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  }

  disc(sx, sy, r, fill, stroke, width) {
    const ctx = this.ctx;
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  outlinedText(text, x, y, size, fill, strokeWidth) {
    const ctx = this.ctx;
    this.font(size);
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  }

  drawPlayer([x, y, fx, fy], team, isMe) {
    const ctx = this.ctx, r = CONFIG.player.r * this.s, [sx, sy] = this.pt(x, y), dir = this.flip ? -1 : 1;
    this.shadow(sx, sy, r);
    if (isMe) {
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = CONFIG.pitchColors.you;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sx, sy, r + 7, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    this.disc(sx, sy, r, team.c, '#fff', Math.max(2, 4 * this.s));
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(sx + fx * dir * r * 0.55, sy + fy * dir * r * 0.55, r * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    this.outlinedText(team.n, sx, sy - r - 4, Math.max(13, r * 0.8), '#fff', 4);
  }

  drawKeeper([x, y], color) {
    const r = CONFIG.keeper.r * this.s, [sx, sy] = this.pt(x, y);
    this.shadow(sx, sy, r);
    this.disc(sx, sy, r, color, '#fde68a', Math.max(2, 4 * this.s));
    this.disc(sx, sy, r * 0.45, '#fde68a', '#fde68a', 1);
  }

  drawBall([x, y]) {
    const r = CONFIG.ball.r * this.s, [sx, sy] = this.pt(x, y);
    this.shadow(sx, sy, r);
    this.disc(sx, sy, r, '#fff', '#111', Math.max(1.5, 2 * this.s));
    this.disc(sx, sy, r * 0.38, '#111', '#111', 1);
  }

  drawHud(s) {
    const ctx = this.ctx, left = this.flip ? 1 : 0, right = 1 - left;
    const w = Math.min(this.W - HUD.sideGap, HUD.maxWidth), x = (this.W - w) / 2, y = HUD.top;
    const h = CONFIG.view.hudHeight - 2 * HUD.top, mid = y + h / 2;
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, HUD.radius); ctx.fill();
    ctx.textBaseline = 'middle';
    const side = (team, align, edge) => {
      const towardCenter = align === 'left' ? 1 : -1;
      ctx.fillStyle = s.tm[team].c;
      ctx.beginPath(); ctx.arc(edge + towardCenter * HUD.chipR, mid, HUD.chipR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = align;
      this.font(HUD.nameSize);
      ctx.fillText(s.tm[team].n, edge + towardCenter * (2 * HUD.chipR + 8), mid + 2);
    };
    side(left, 'left', x + 14);
    side(right, 'right', x + w - 14);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    this.font(HUD.scoreSize);
    ctx.fillText(`${s.sc[left]} : ${s.sc[right]}`, this.W / 2, mid - 6);
    this.font(HUD.clockSize);
    ctx.fillText(`⏱ ${formatClock(s.tl)}`, this.W / 2, y + h - 9);
  }

  bigText(text, color, size, offsetY = 0) {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cy = this.oy + CONFIG.field.h * this.s / 2 + offsetY;
    this.outlinedText(text, this.W / 2, cy, size, color, Math.max(6, size / 8));
  }

  drawPhase(s) {
    const size = Math.min(this.W, this.H) * BIG_TEXT_RATIO;
    if (s.ph === 'countdown') this.bigText(String(Math.max(1, Math.ceil(s.pt))), '#fff', size);
    if (s.ph === 'goal' && s.lg >= 0) {
      this.bigText(CONFIG.text.goal, s.tm[s.lg].c, size);
      this.bigText(s.tm[s.lg].n, '#fff', size * 0.35, size * 0.7);
    }
  }

  drawBanner(text) {
    const ctx = this.ctx;
    this.font(BANNER.size);
    const w = ctx.measureText(text).width + BANNER.padding, x = (this.W - w) / 2, y = (this.H - BANNER.height) / 2;
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath(); ctx.roundRect(x, y, w, BANNER.height, BANNER.radius); ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, this.W / 2, y + BANNER.height / 2 + 2);
  }
}
