import { CONFIG } from '../config.js';
import { clamp, clampMagnitude, round, unit } from './utils.js';

export const keeperLineX = (team) => (team === 0 ? CONFIG.keeper.lineOffset : CONFIG.field.w - CONFIG.keeper.lineOffset);
export const attackDir = (team) => (team === 0 ? 1 : -1);

const makeBody = (x, y, r, fx) => ({ x, y, r, vx: 0, vy: 0, fx, fy: 0, cooldown: 0, kickBuffer: 0, dashTime: 0, dashCooldown: 0 });

function pushApart(a, b, shareA) {
  const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy), min = a.r + b.r;
  if (d >= min || d === 0) return;
  const overlap = min - d, nx = dx / d, ny = dy / d;
  a.x += nx * overlap * shareA; a.y += ny * overlap * shareA;
  b.x -= nx * overlap * (1 - shareA); b.y -= ny * overlap * (1 - shareA);
}

/** Authoritative 1v1 match simulation (plus one AI keeper per team). Pure logic, no DOM. */
export class Match {
  constructor(teams, minutes, random = Math.random) {
    this.teams = teams.map(t => ({ n: t.name, c: t.color }));
    this.duration = minutes * 60;
    this.random = random;
    this.restart();
  }

  restart() {
    this.score = [0, 0];
    this.timeLeft = this.duration;
    this.kicks = 0;
    this.lastGoal = -1;
    this.kickoff(CONFIG.match.countdown);
  }

  kickoff(countdown) {
    const { w, h } = CONFIG.field;
    this.players = [0, 1].map(t => makeBody(w * CONFIG.player.kickoffX[t], h / 2, CONFIG.player.r, attackDir(t)));
    this.keepers = [0, 1].map(t => makeBody(keeperLineX(t), h / 2, CONFIG.keeper.r, attackDir(t)));
    this.ball = makeBody(w / 2, h / 2, CONFIG.ball.r, 0);
    this.setPhase('countdown', countdown);
  }

  setPhase(name, time) {
    this.phase = name;
    this.phaseTime = time;
  }

  advance(dt, inputs) {
    switch (this.phase) {
      case 'end':
        return;
      case 'countdown':
        this.phaseTime -= dt;
        if (this.phaseTime <= 0) this.setPhase('play', 0);
        return;
      case 'goal':
        this.phaseTime -= dt;
        if (this.phaseTime <= 0) { this.kickoff(CONFIG.match.restartCountdown); return; }
        break;
      case 'play':
        this.timeLeft = Math.max(0, this.timeLeft - dt);
        if (this.timeLeft === 0) { this.setPhase('end', 0); return; }
        break;
    }
    this.simulate(dt, inputs);
  }

  simulate(dt, inputs) {
    const steps = Math.ceil(dt / CONFIG.physicsStep);
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.step(h, inputs.map(inp => ({ ...inp, kick: inp.kick && i === 0 })));
    }
  }

  step(h, inputs) {
    const { players, keepers } = this;
    players.forEach((p, t) => this.movePlayer(p, inputs[t], h));
    keepers.forEach((k, t) => this.moveKeeper(k, t, h));
    pushApart(players[0], players[1], 0.5);
    players.forEach(p => keepers.forEach(k => pushApart(p, k, 1)));
    players.forEach(p => { this.tryKick(p); this.collideBall(p); });
    this.controlBall();
    keepers.forEach((k, t) => { this.keeperKick(k, t); this.collideBall(k); });
    this.moveBall(h);
    if (this.phase === 'play') this.checkGoal();
  }

  movePlayer(p, input, h) {
    const cfg = CONFIG.player, { w, h: H } = CONFIG.field;
    if (Math.hypot(input.x, input.y) > cfg.facingDeadzone) [p.fx, p.fy] = unit(input.x, input.y);
    if (input.kick) this.pressKick(p);
    const dashing = p.dashTime > 0;
    const speed = dashing ? cfg.speed * CONFIG.dash.boost : cfg.speed;
    const [dx, dy] = dashing ? [p.fx, p.fy] : [input.x, input.y];
    const k = Math.min(1, cfg.accel * h);
    p.vx += (dx * speed - p.vx) * k;
    p.vy += (dy * speed - p.vy) * k;
    p.x = clamp(p.x + p.vx * h, p.r, w - p.r);
    p.y = clamp(p.y + p.vy * h, p.r, H - p.r);
    p.kickBuffer -= h;
    p.cooldown -= h;
    p.dashTime -= h;
    p.dashCooldown -= h;
  }

  /** The kick button shoots when the ball is in reach; otherwise it starts a short dash. */
  pressKick(p) {
    p.kickBuffer = CONFIG.kick.buffer;
    if (p.dashCooldown > 0 || this.inKickReach(p)) return;
    const speed = CONFIG.player.speed * CONFIG.dash.boost;
    p.dashTime = CONFIG.dash.duration;
    p.dashCooldown = CONFIG.dash.cooldown;
    p.vx = p.fx * speed;
    p.vy = p.fy * speed;
  }

  inKickReach(p) {
    return this.ballDistance(p) <= p.r + this.ball.r + CONFIG.kick.reach;
  }

  moveKeeper(k, team, h) {
    const cfg = CONFIG.keeper, f = CONFIG.field;
    const reach = f.goalH / 2 - k.r * cfg.mouthInset;
    const tx = keeperLineX(team), ty = clamp(this.ball.y, f.h / 2 - reach, f.h / 2 + reach);
    const dx = tx - k.x, dy = ty - k.y, d = Math.hypot(dx, dy);
    const speed = d > 0 ? Math.min(cfg.speed, d / h) : 0;
    k.vx = d > 0 ? dx / d * speed : 0;
    k.vy = d > 0 ? dy / d * speed : 0;
    k.x += k.vx * h;
    k.y += k.vy * h;
    k.cooldown -= h;
  }

  ballDistance(body) {
    return Math.hypot(this.ball.x - body.x, this.ball.y - body.y);
  }

  tryKick(p) {
    const b = this.ball, cfg = CONFIG.kick;
    if (p.kickBuffer <= 0 || p.cooldown > 0 || !this.inKickReach(p)) return;
    const [tx, ty] = unit(b.x - p.x, b.y - p.y);
    const aim = cfg.aimWeight;
    const [dx, dy] = unit(p.fx * aim + tx * (1 - aim), p.fy * aim + ty * (1 - aim));
    this.launchBall(dx, dy, cfg.power);
    p.cooldown = cfg.cooldown;
    p.kickBuffer = 0;
  }

  keeperKick(k, team) {
    const cfg = CONFIG.keeper, f = CONFIG.field;
    if (k.cooldown > 0 || this.ballDistance(k) > k.r + this.ball.r + cfg.touchSlack) return;
    const targetY = f.h / 2 + (this.random() * 2 - 1) * cfg.kickSpread;
    const [dx, dy] = unit(f.w / 2 - k.x + attackDir(team), targetY - k.y);
    this.launchBall(dx, dy, cfg.kickPower);
    k.cooldown = cfg.cooldown;
  }

  launchBall(dx, dy, power) {
    this.ball.vx = dx * power;
    this.ball.vy = dy * power;
    this.kicks++;
  }

  collideBall(c) {
    const b = this.ball, cfg = CONFIG.dribble;
    const dx = b.x - c.x, dy = b.y - c.y, d = Math.hypot(dx, dy), min = c.r + b.r;
    if (d >= min || d === 0) return;
    const nx = dx / d, ny = dy / d;
    b.x = c.x + nx * min;
    b.y = c.y + ny * min;
    const ballN = b.vx * nx + b.vy * ny;
    const bodyN = c.vx * nx + c.vy * ny;
    const wanted = Math.max(bodyN * cfg.push, cfg.minPush, -ballN * CONFIG.ball.bodyBounce);
    if (wanted > ballN) {
      b.vx += (wanted - ballN) * nx;
      b.vy += (wanted - ballN) * ny;
    }
  }

  /** The nearest player close to a slow enough ball carries it at their feet, in front of them. */
  controlBall() {
    const b = this.ball, cfg = CONFIG.dribble;
    const canControl = (p) => p.cooldown <= 0
      && this.ballDistance(p) <= p.r + b.r + cfg.controlReach
      && Math.hypot(b.vx - p.vx, b.vy - p.vy) <= cfg.maxCatchSpeed;
    const [owner] = this.players.filter(canControl).sort((p, q) => this.ballDistance(p) - this.ballDistance(q));
    if (!owner) return;
    const hold = owner.r + b.r + cfg.controlGap;
    const [pullX, pullY] = clampMagnitude(
      (owner.x + owner.fx * hold - b.x) * cfg.pullRate,
      (owner.y + owner.fy * hold - b.y) * cfg.pullRate,
      cfg.maxCatchSpeed,
    );
    b.vx = owner.vx + pullX;
    b.vy = owner.vy + pullY;
  }

  moveBall(h) {
    const b = this.ball, cfg = CONFIG.ball, f = CONFIG.field, r = b.r;
    const keep = cfg.keepPerSecond ** h;
    [b.vx, b.vy] = clampMagnitude(b.vx * keep, b.vy * keep, cfg.maxSpeed);
    b.x += b.vx * h;
    b.y += b.vy * h;

    const top = f.h / 2 - f.goalH / 2 + r, bottom = f.h / 2 + f.goalH / 2 - r;
    const betweenPosts = b.y > top - r && b.y < bottom + r;
    if (betweenPosts && (b.x < 0 || b.x > f.w)) {
      this.bounceInsideNet(top, bottom);
      return;
    }
    const inMouth = b.y > top && b.y < bottom;
    if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy) * cfg.wallBounce; }
    if (b.y > f.h - r) { b.y = f.h - r; b.vy = -Math.abs(b.vy) * cfg.wallBounce; }
    if (!inMouth && b.x < r) { b.x = r; b.vx = Math.abs(b.vx) * cfg.wallBounce; }
    if (!inMouth && b.x > f.w - r) { b.x = f.w - r; b.vx = -Math.abs(b.vx) * cfg.wallBounce; }
  }

  bounceInsideNet(top, bottom) {
    const b = this.ball, f = CONFIG.field, bounce = CONFIG.ball.netBounce;
    const back = f.goalDepth - b.r;
    if (b.y < top) { b.y = top; b.vy = Math.abs(b.vy) * bounce; }
    if (b.y > bottom) { b.y = bottom; b.vy = -Math.abs(b.vy) * bounce; }
    if (b.x < -back) { b.x = -back; b.vx = Math.abs(b.vx) * bounce; }
    if (b.x > f.w + back) { b.x = f.w + back; b.vx = -Math.abs(b.vx) * bounce; }
  }

  checkGoal() {
    const b = this.ball, w = CONFIG.field.w;
    const scorer = b.x < -b.r ? 1 : b.x > w + b.r ? 0 : -1;
    if (scorer < 0) return;
    this.score[scorer]++;
    this.lastGoal = scorer;
    this.setPhase('goal', CONFIG.match.goalPause);
  }

  snapshot() {
    const pos = (o) => [round(o.x, 1), round(o.y, 1)];
    return {
      ph: this.phase, pt: round(this.phaseTime, 2), tl: round(this.timeLeft, 1),
      sc: [...this.score], lg: this.lastGoal, kc: this.kicks, tm: this.teams,
      b: pos(this.ball),
      p: this.players.map(p => [...pos(p), round(p.fx, 2), round(p.fy, 2)]),
      g: this.keepers.map(pos),
    };
  }
}
