import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { Match, keeperLineX } from '../src/core/match.js';

const TEAMS = [{ name: 'Ali', color: CONFIG.colors[0] }, { name: 'Ayşe', color: CONFIG.colors[1] }];
const IDLE = { x: 0, y: 0, kick: null };
const FRAME = 1 / 60;
const { w, h } = CONFIG.field;

const newMatch = (minutes = 2) => new Match(TEAMS, minutes, () => 0.5);
const toPlay = (m) => { m.advance(CONFIG.match.countdown + FRAME, [IDLE, IDLE]); return m; };
const run = (m, seconds, inputs = [IDLE, IDLE]) => {
  for (let t = 0; t < seconds; t += FRAME) m.advance(FRAME, typeof inputs === 'function' ? inputs(m) : inputs);
};
const rollBall = (m, x, y, vx, vy) => Object.assign(m.ball, { x, y, vx, vy });
const parkKeepers = (m) => m.keepers.forEach(k => { k.y = -1000; });

test('starts with a countdown and both players on their own half', () => {
  const m = newMatch();
  assert.equal(m.phase, 'countdown');
  assert.deepEqual(m.score, [0, 0]);
  assert.ok(m.players[0].x < w / 2 && m.players[1].x > w / 2);
  assert.deepEqual([m.ball.x, m.ball.y], [w / 2, h / 2]);
});

test('players are frozen during the countdown and the clock does not run', () => {
  const m = newMatch();
  const x = m.players[0].x;
  m.advance(1, [{ x: 1, y: 0, kick: null }, IDLE]);
  assert.equal(m.players[0].x, x);
  assert.equal(m.timeLeft, m.duration);
});

test('countdown turns into play', () => {
  assert.equal(toPlay(newMatch()).phase, 'play');
});

test('a player moves in the joystick direction', () => {
  const m = toPlay(newMatch());
  const x = m.players[0].x;
  run(m, 0.5, [{ x: 1, y: 0, kick: null }, IDLE]);
  assert.ok(m.players[0].x > x);
});

test('players stay inside the pitch', () => {
  const m = toPlay(newMatch());
  run(m, 5, [{ x: -1, y: -1, kick: null }, { x: 1, y: 1, kick: null }]);
  const [a, b] = m.players;
  assert.ok(a.x >= a.r && a.y >= a.r);
  assert.ok(b.x <= w - b.r && b.y <= h - b.r);
});

test('kicking near the ball launches it in the facing direction', () => {
  const m = toPlay(newMatch());
  const p = m.players[0];
  Object.assign(p, { x: m.ball.x - p.r - m.ball.r - 2, y: m.ball.y, fx: 1, fy: 0 });
  const kicks = m.kicks;
  m.advance(FRAME, [{ x: 0, y: 0, kick: 1 }, IDLE]);
  assert.equal(m.kicks, kicks + 1);
  assert.ok(m.ball.vx > CONFIG.kick.maxPower * 0.5);
});

test('shot power follows the charge level', () => {
  const shoot = (power) => {
    const m = toPlay(newMatch());
    const p = m.players[0];
    Object.assign(p, { x: m.ball.x - p.r - m.ball.r - 2, y: m.ball.y, fx: 1, fy: 0 });
    m.advance(CONFIG.physicsStep, [{ x: 0, y: 0, kick: power }, IDLE]);
    return Math.hypot(m.ball.vx, m.ball.vy);
  };
  const near = (a, b) => Math.abs(a - b) < b * 0.05;
  assert.ok(near(shoot(0), CONFIG.kick.minPower));
  assert.ok(near(shoot(1), CONFIG.kick.maxPower));
  assert.ok(shoot(0.5) > shoot(0) && shoot(0.5) < shoot(1));
  assert.ok(near(shoot(7), CONFIG.kick.maxPower), 'power above 1 is clamped');
});

test('kicking far from the ball does nothing', () => {
  const m = toPlay(newMatch());
  const kicks = m.kicks;
  m.advance(FRAME, [{ x: 0, y: 0, kick: 1 }, IDLE]);
  assert.equal(m.kicks, kicks);
});

test('kicking away from the ball starts a dash, limited by a cooldown', () => {
  const m = toPlay(newMatch());
  const p = m.players[1];
  const dashSpeed = CONFIG.player.speed * CONFIG.dash.boost;
  m.advance(FRAME, [IDLE, { x: 0, y: 0, kick: 1 }]);
  assert.ok(Math.abs(p.vx) > CONFIG.player.speed, 'faster than running');
  run(m, CONFIG.dash.duration * 2);
  m.advance(FRAME, [IDLE, { x: 0, y: 0, kick: 1 }]);
  assert.ok(Math.abs(p.vx) < dashSpeed * 0.5, 'second dash is blocked by the cooldown');
});

test('a kick pressed slightly early is still taken (input buffer)', () => {
  const m = toPlay(newMatch());
  const p = m.players[0];
  Object.assign(p, { x: m.ball.x - 80, y: m.ball.y, fx: 1, fy: 0 });
  m.advance(FRAME, [{ x: 1, y: 0, kick: 1 }, IDLE]);
  run(m, CONFIG.kick.buffer * 0.9, [{ x: 1, y: 0, kick: null }, IDLE]);
  assert.ok(m.kicks >= 1);
});

test('a player carries the ball in front while running', () => {
  const m = toPlay(newMatch());
  const p = m.players[0];
  Object.assign(p, { x: m.ball.x - p.r - m.ball.r - 2, y: m.ball.y });
  run(m, 0.6, [{ x: 0, y: 1, kick: null }, IDLE]);
  const hold = p.r + m.ball.r + CONFIG.dribble.controlGap;
  assert.ok(Math.abs(m.ball.x - p.x) < 6, 'ball swung in front of the new direction');
  assert.ok(Math.abs(m.ball.y - (p.y + hold)) < 6, 'ball stays at the feet');
});

test('a fast ball is not caught', () => {
  const m = toPlay(newMatch());
  const p = m.players[0];
  const speed = CONFIG.dribble.maxCatchSpeed * 1.5;
  rollBall(m, p.x, p.y - p.r - m.ball.r - CONFIG.dribble.controlReach / 2, speed, 0);
  run(m, 0.2);
  assert.ok(m.ballDistance(p) > p.r + m.ball.r + CONFIG.dribble.controlReach);
});

test('ball entering the right goal scores for team 0', () => {
  const m = toPlay(newMatch());
  parkKeepers(m);
  rollBall(m, w - 30, h / 2, 900, 0);
  run(m, 0.3, (mm) => { parkKeepers(mm); return [IDLE, IDLE]; });
  assert.deepEqual(m.score, [1, 0]);
  assert.equal(m.lastGoal, 0);
  assert.equal(m.phase, 'goal');
});

test('ball entering the left goal scores for team 1', () => {
  const m = toPlay(newMatch());
  parkKeepers(m);
  rollBall(m, 30, h / 2, -900, 0);
  run(m, 0.3, (mm) => { parkKeepers(mm); return [IDLE, IDLE]; });
  assert.deepEqual(m.score, [0, 1]);
});

test('ball hitting the end line outside the goal bounces back', () => {
  const m = toPlay(newMatch());
  rollBall(m, w - 30, 40, 900, 0);
  run(m, 0.2);
  assert.ok(m.ball.vx < 0);
  assert.deepEqual(m.score, [0, 0]);
});

test('pushing the ball into a corner never scores', () => {
  for (const [dirX, dirY] of [[1, -1], [1, 1], [1, 0.2]]) {
    const m = toPlay(newMatch());
    const cornerY = dirY < 0 ? 0 : h;
    Object.assign(m.players[0], { x: w - 90, y: cornerY - dirY * 70 });
    rollBall(m, w - 45, cornerY - dirY * 35, 0, 0);
    run(m, 2, [{ x: dirX, y: dirY, kick: null }, IDLE]);
    assert.deepEqual(m.score, [0, 0]);
    assert.ok(m.ball.x <= w, 'ball stays on the pitch');
  }
});

test('ball bounces off the side lines', () => {
  const m = toPlay(newMatch());
  rollBall(m, w / 2, 30, 0, -900);
  run(m, 0.1);
  assert.ok(m.ball.vy > 0 && m.ball.y >= m.ball.r);
});

test('after a goal the match restarts from kickoff with a short countdown', () => {
  const m = toPlay(newMatch());
  parkKeepers(m);
  rollBall(m, w - 30, h / 2, 900, 0);
  run(m, 0.3, (mm) => { parkKeepers(mm); return [IDLE, IDLE]; });
  run(m, CONFIG.match.goalPause);
  assert.equal(m.phase, 'countdown');
  assert.deepEqual([m.ball.x, m.ball.y], [w / 2, h / 2]);
  assert.deepEqual(m.score, [1, 0]);
});

test('the match ends when the clock runs out', () => {
  const m = toPlay(newMatch(2));
  run(m, 2 * 60 + 1);
  assert.equal(m.phase, 'end');
  assert.equal(m.timeLeft, 0);
});

test('nothing moves after the match has ended', () => {
  const m = toPlay(newMatch(2));
  run(m, 2 * 60 + 1);
  const snap = JSON.stringify(m.snapshot());
  run(m, 1, [{ x: 1, y: 1, kick: 1 }, IDLE]);
  assert.equal(JSON.stringify(m.snapshot()), snap);
});

test('restart resets score, clock and phase', () => {
  const m = toPlay(newMatch());
  m.score = [3, 2];
  run(m, 10);
  m.restart();
  assert.deepEqual(m.score, [0, 0]);
  assert.equal(m.timeLeft, m.duration);
  assert.equal(m.phase, 'countdown');
});

test('keepers stay on their goal line and inside the goal mouth', () => {
  const m = toPlay(newMatch());
  rollBall(m, w / 2, 5, 0, 0);
  run(m, 3);
  m.keepers.forEach((k, t) => {
    assert.ok(Math.abs(k.x - keeperLineX(t)) < 1e-6);
    assert.ok(Math.abs(k.y - h / 2) <= CONFIG.field.goalH / 2);
  });
});

test('a keeper clears a ball that reaches it', () => {
  const m = toPlay(newMatch());
  const k = m.keepers[1];
  rollBall(m, k.x - k.r - m.ball.r - 1, k.y, 50, 0);
  run(m, 0.1);
  assert.ok(m.ball.vx < 0, 'ball is sent back toward the other half');
});

test('snapshot has the shape the network expects', () => {
  const s = newMatch().snapshot();
  assert.equal(s.p.length, 2);
  assert.equal(s.p[0].length, 4);
  assert.equal(s.g.length, 2);
  assert.deepEqual(s.tm.map(t => t.n), ['Ali', 'Ayşe']);
  assert.ok(JSON.stringify(s).length < 1024);
});
