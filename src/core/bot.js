import { CONFIG } from '../config.js';
import { attackDir } from './match.js';
import { unit } from './utils.js';

const IDLE = { x: 0, y: 0 };

/**
 * Computer opponent. Reads a Match and produces the same input a human controller would.
 * `level` is one of CONFIG.bot.levels: it sets how fast the bot runs, how often it
 * rethinks where to go, from how far it shoots, how well it aims and how readily it dashes.
 */
export class Bot {
  constructor(team, level, random = Math.random) {
    this.team = team;
    this.level = level;
    this.random = random;
    this.thinkTimer = 0;
    this.move = IDLE;
    this.wantsDash = false;
  }

  decide(match, dt) {
    this.thinkTimer -= dt;
    if (this.thinkTimer <= 0) {
      this.thinkTimer = this.level.think;
      this.move = this.chooseMove(match);
      this.wantsDash = this.shouldDash(match);
    }
    const kick = this.shouldShoot(match) || this.wantsDash;
    this.wantsDash = false;
    return { ...this.move, kick };
  }

  me(match) { return match.players[this.team]; }

  goalX() { return this.team === 0 ? CONFIG.field.w : 0; }

  hasBall(match) { return match.ballOwner() === this.me(match); }

  chooseMove(match) {
    const me = this.me(match);
    const [tx, ty] = this.hasBall(match) ? this.shootingTarget(me) : this.chaseTarget(match, me);
    const [x, y] = unit(tx - me.x, ty - me.y);
    return { x: x * this.level.speed, y: y * this.level.speed };
  }

  /** Runs at the far side of the goal, away from where the keeper stands, missing by up to the level's aim error. */
  shootingTarget(me) {
    const f = CONFIG.field, mid = f.h / 2;
    const side = me.y < mid ? 1 : -1;
    const error = (this.random() * 2 - 1) * this.level.aimError;
    return [this.goalX(), mid + side * (f.goalH / 2 - CONFIG.bot.cornerMargin) + error];
  }

  /**
   * Goes straight for a ball the opponent carries, to take it. Otherwise gets behind
   * the ball, going around it when the bot is on the wrong side.
   */
  chaseTarget(match, me) {
    const b = match.ball, dir = attackDir(this.team), cfg = CONFIG.bot;
    if (match.ballOwner()) return [b.x, b.y];
    const isAhead = (me.x - b.x) * dir > 0;
    const detour = isAhead ? Math.sign(me.y - b.y || 1) * cfg.detour : 0;
    return [b.x - dir * cfg.approachOffset, b.y + detour];
  }

  /** Shoots once in range and facing a spot between the posts. */
  shouldShoot(match) {
    const me = this.me(match), f = CONFIG.field;
    const distance = Math.abs(this.goalX() - me.x);
    if (!this.hasBall(match) || distance > this.level.shootRange || me.fx * attackDir(this.team) <= 0) return false;
    const crossingY = me.y + (me.fy / Math.abs(me.fx)) * distance;
    return Math.abs(crossingY - f.h / 2) < f.goalH / 2 - match.ball.r;
  }

  shouldDash(match) {
    const far = match.ballDistance(this.me(match)) > CONFIG.bot.dashDistance;
    return far && this.random() < this.level.dashChance;
  }
}
