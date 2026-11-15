import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { EffectWatcher } from '../src/audio/effect-watcher.js';
import { Controller } from '../src/input/controller.js';
import { KeyboardSource } from '../src/input/keyboard-source.js';
import { Smoother } from '../src/render/smoother.js';
import { Profile } from '../src/ui/profile.js';

const source = (x, y, kick = false) => ({ read: () => ({ x, y, kick }) });
const state = (overrides = {}) => ({ ph: 'play', sc: [0, 0], kc: 0, b: [0, 0], p: [[0, 0, 1, 0], [10, 0, -1, 0]], g: [[0, 0], [0, 0]], ...overrides });

test('Controller merges sources and limits the stick to length 1', () => {
  const r = new Controller([source(1, 0), source(0, 1, true)]).read();
  assert.ok(Math.abs(Math.hypot(r.x, r.y) - 1) < 1e-9);
  assert.equal(r.kick, true);
});

test('Controller inverts direction for the rotated guest view', () => {
  const r = new Controller([source(0.5, -0.5)], true).read();
  assert.deepEqual([r.x, r.y], [-0.5, 0.5]);
});

test('KeyboardSource reads held keys and one kick per press', () => {
  const target = new EventTarget();
  const keys = new KeyboardSource(CONFIG.keys[0], target);
  const press = (type, code, repeat = false) => target.dispatchEvent(Object.assign(new Event(type), { code, repeat }));
  press('keydown', 'KeyD');
  press('keydown', 'Space');
  assert.deepEqual(keys.read(), { x: 1, y: 0, kick: true });
  press('keydown', 'Space', true);
  assert.equal(keys.read().kick, false);
  press('keyup', 'KeyD');
  assert.equal(keys.read().x, 0);
  keys.dispose();
});

test('Smoother passes through when rate is infinite', () => {
  const s = state({ b: [100, 100] });
  assert.equal(new Smoother(Infinity).apply(s, 0.016), s);
});

test('Smoother eases small moves and snaps big jumps', () => {
  const sm = new Smoother(CONFIG.view.smoothing);
  sm.apply(state({ b: [0, 0] }), 0.016);
  const eased = sm.apply(state({ b: [10, 0] }), 0.016);
  assert.ok(eased.b[0] > 0 && eased.b[0] < 10);
  const far = CONFIG.view.snapDistance * 2;
  assert.equal(sm.apply(state({ b: [far, 0] }), 0.016).b[0], far);
});

test('EffectWatcher plays the right sounds on changes', () => {
  const played = [];
  const sfx = { kick: () => played.push('kick'), goal: () => played.push('goal'), whistle: (n = 1) => played.push(`whistle${n}`) };
  const fx = new EffectWatcher(sfx);
  fx.observe(state({ ph: 'countdown' }));
  fx.observe(state({ ph: 'play' }));
  fx.observe(state({ kc: 1 }));
  fx.observe(state({ kc: 1, sc: [1, 0], ph: 'goal' }));
  fx.observe(state({ kc: 1, sc: [1, 0], ph: 'end' }));
  assert.deepEqual(played, ['whistle1', 'kick', 'goal', `whistle${CONFIG.sound.endWhistles}`]);
});

test('Profile round-trips and falls back on bad data', () => {
  const store = new Map();
  const storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  assert.equal(Profile.load(storage).name, CONFIG.defaultNames[0]);
  Profile.save({ name: 'Ali', color: CONFIG.colors[2], minutes: 5 }, storage);
  assert.deepEqual(Profile.load(storage), { name: 'Ali', color: CONFIG.colors[2], minutes: 5 });
  store.set(CONFIG.storageKey, '{broken');
  assert.equal(Profile.load(storage).minutes, CONFIG.match.defaultDuration);
});
