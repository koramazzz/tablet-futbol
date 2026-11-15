import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { Bot } from '../src/core/bot.js';
import { Match } from '../src/core/match.js';

const TEAMS = [{ name: 'Ali', color: CONFIG.colors[0] }, { name: 'Bot', color: CONFIG.colors[1] }];
const IDLE = { x: 0, y: 0, kick: false };
const FRAME = 1 / 60;
const [EASY, , HARD] = CONFIG.bot.levels;
const { w, h } = CONFIG.field;

const seeded = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const playing = () => {
  const m = new Match(TEAMS, 3, seeded());
  m.advance(CONFIG.match.countdown + FRAME, [IDLE, IDLE]);
  return m;
};
const playOut = (m, bot, human = () => IDLE) => {
  while (m.phase !== 'end') m.advance(FRAME, [human(m), bot.decide(m, FRAME)]);
  return m.score;
};

test('the bot runs toward a loose ball', () => {
  const m = playing();
  const input = new Bot(1, HARD, () => 1).decide(m, FRAME);
  assert.ok(input.x < 0, 'ball is to its left');
  assert.equal(input.kick, false);
});

test('the bot goes around the ball when it is on the wrong side', () => {
  const m = playing();
  Object.assign(m.players[1], { x: w / 2 - 150, y: h / 2 });
  const input = new Bot(1, HARD, seeded()).decide(m, FRAME);
  assert.ok(input.x > 0 && input.y !== 0);
});

test('an easy bot moves slower than a hard one', () => {
  const speed = (level) => {
    const { x, y } = new Bot(1, level, seeded()).decide(playing(), FRAME);
    return Math.hypot(x, y);
  };
  assert.ok(Math.abs(speed(EASY) - EASY.speed) < 1e-9);
  assert.ok(speed(EASY) < speed(HARD) && speed(HARD) <= 1);
});

test('the bot shoots when it has the ball in range and faces the goal', () => {
  const m = playing();
  const p = m.players[1];
  Object.assign(p, { x: HARD.shootRange - 20, y: h / 2, fx: -1, fy: 0 });
  Object.assign(m.ball, { x: p.x - p.r - m.ball.r - 2, y: p.y });
  assert.equal(new Bot(1, HARD, seeded()).decide(m, FRAME).kick, true);
  Object.assign(p, { fx: 1 });
  assert.equal(new Bot(1, HARD, seeded()).decide(m, FRAME).kick, false, 'not while facing its own goal');
});

test('the bot goes straight for a ball the opponent carries', () => {
  const m = playing();
  const carrier = m.players[0];
  Object.assign(carrier, { x: 300, y: 200 });
  Object.assign(m.ball, { x: carrier.x + carrier.r + m.ball.r + CONFIG.dribble.controlGap, y: carrier.y });
  assert.equal(m.ballOwner(), carrier);
  const me = m.players[1];
  const { x, y } = new Bot(1, HARD, () => 1).decide(m, FRAME);
  const toBall = Math.atan2(m.ball.y - me.y, m.ball.x - me.x);
  assert.ok(Math.abs(Math.atan2(y, x) - toBall) < 1e-9);
});

// A stand-in for a child: runs at the ball, carries it straight at the goal and shoots from close.
const chaser = (m) => {
  const p = m.players[0], carrying = m.ballOwner() === p;
  const [tx, ty] = carrying ? [w, h / 2] : [m.ball.x, m.ball.y];
  const d = Math.hypot(tx - p.x, ty - p.y) || 1;
  return { x: (tx - p.x) / d, y: (ty - p.y) / d, kick: carrying && w - p.x < 250 };
};

test('a match against every level is lively: both sides get goals', () => {
  for (const level of CONFIG.bot.levels) {
    const [chaserGoals, botGoals] = playOut(playing(), new Bot(1, level, seeded()), chaser);
    assert.ok(chaserGoals >= 1 && botGoals >= 1, `${level.id}: ${chaserGoals}-${botGoals}`);
  }
});
