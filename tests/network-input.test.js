import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { Match } from '../src/core/match.js';
import { isValidState, sanitizeState } from '../src/core/snapshot.js';
import { guestInput, guestTeam } from '../src/sessions/host-session.js';

const validState = () => new Match([{ name: 'A', color: CONFIG.colors[0] }, { name: 'B', color: CONFIG.colors[1] }], 2).snapshot();

test('a real snapshot is valid', () => {
  assert.ok(isValidState(validState()));
});

test('malformed snapshots are rejected', () => {
  assert.equal(isValidState(null), false);
  assert.equal(isValidState({}), false);
  assert.equal(isValidState({ ...validState(), b: ['x', 1] }), false);
  assert.equal(isValidState({ ...validState(), p: [[1, 2]] }), false);
  assert.equal(isValidState({ ...validState(), tm: [null, null] }), false);
});

test('sanitizeState fixes untrusted names, colours and numbers', () => {
  const s = sanitizeState({ ...validState(), tm: [{ n: '', c: 'red' }, { n: 'B', c: CONFIG.colors[3] }], sc: [NaN, 2], tl: 'x' });
  assert.equal(s.tm[0].n, CONFIG.defaultNames[0]);
  assert.equal(s.tm[0].c, CONFIG.colors[0]);
  assert.equal(s.tm[1].c, CONFIG.colors[3]);
  assert.deepEqual(s.sc, [0, 2]);
  assert.equal(s.tl, 0);
});

test('guestInput clamps hostile values', () => {
  assert.deepEqual(guestInput({ ix: 'a', iy: null }, false, false), { x: 0, y: 0, kick: null, dash: false });
  assert.equal(guestInput({}, false, true).dash, true);
  assert.equal(guestInput({ kp: 0.3 }, true, false).kick, 0.3);
  assert.equal(guestInput({ kp: 99 }, true, false).kick, 1);
  assert.equal(guestInput({ kp: 'x' }, true, false).kick, 1);
  const { x, y } = guestInput({ ix: 99, iy: 99 }, true, false);
  assert.ok(Math.hypot(x, y) <= 1 + 1e-9);
});

test('guestTeam never shares the host colour', () => {
  const host = CONFIG.colors[0];
  assert.notEqual(guestTeam({ name: 'B', color: host }, host).color, host);
  assert.notEqual(guestTeam({ name: 'B', color: 'bogus' }, host).color, host);
  assert.equal(guestTeam({ name: 'B', color: CONFIG.colors[4] }, host).color, CONFIG.colors[4]);
});
