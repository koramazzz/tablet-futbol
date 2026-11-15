import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { EffectWatcher } from '../src/audio/effect-watcher.js';
import { Charge } from '../src/input/charge.js';
import { Controller } from '../src/input/controller.js';
import { DashButton } from '../src/input/dash-button.js';
import { KeyboardSource } from '../src/input/keyboard-source.js';
import { KickButton } from '../src/input/kick-button.js';
import { Confetti } from '../src/render/confetti.js';
import { Smoother } from '../src/render/smoother.js';
import { Profile } from '../src/ui/profile.js';

const source = (x, y, kick = null, dash = false) => ({ read: () => ({ x, y, kick, dash }) });
const state = (overrides = {}) => ({ ph: 'play', sc: [0, 0], kc: 0, b: [0, 0], p: [[0, 0, 1, 0], [10, 0, -1, 0]], g: [[0, 0], [0, 0]], ...overrides });

test('Controller merges sources and limits the stick to length 1', () => {
  const r = new Controller([source(1, 0), source(0, 1, 0.4)]).read();
  assert.ok(Math.abs(Math.hypot(r.x, r.y) - 1) < 1e-9);
  assert.equal(r.kick, 0.4);
});

test('Controller inverts direction for the rotated guest view', () => {
  const r = new Controller([source(0.5, -0.5)], true).read();
  assert.deepEqual([r.x, r.y], [-0.5, 0.5]);
});

const fakeClock = () => {
  const clock = { ms: 0 };
  return { clock, charge: new Charge(() => clock.ms) };
};
const CHARGE_MS = CONFIG.kick.chargeTime * 1000;

test('Charge grows with hold time up to 1', () => {
  const { clock, charge } = fakeClock();
  assert.equal(charge.level, 0);
  charge.press();
  clock.ms = CHARGE_MS / 2;
  assert.ok(Math.abs(charge.level - 0.5) < 1e-9);
  clock.ms = CHARGE_MS * 3;
  assert.equal(charge.release(), 1);
  assert.equal(charge.active, false);
});

test('KeyboardSource reads held keys and shoots on release with the charged power', () => {
  const target = new EventTarget();
  const { clock, charge } = fakeClock();
  const keys = new KeyboardSource(CONFIG.keys[0], target, charge);
  const press = (type, code, repeat = false) => target.dispatchEvent(Object.assign(new Event(type), { code, repeat }));
  press('keydown', 'KeyD');
  press('keydown', 'Space');
  press('keydown', 'ShiftLeft');
  assert.deepEqual(keys.read(), { x: 1, y: 0, kick: null, dash: true });
  assert.equal(keys.read().dash, false);
  clock.ms = CHARGE_MS / 2;
  press('keydown', 'Space', true);
  press('keyup', 'Space');
  assert.ok(Math.abs(keys.read().kick - 0.5) < 1e-9);
  assert.equal(keys.read().kick, null);
  press('keyup', 'KeyD');
  assert.equal(keys.read().x, 0);
  keys.dispose();
});

test('KickButton charges while held and kicks once on release', () => {
  const { clock, charge } = fakeClock();
  const button = new KickButton(() => true, () => [0, 0], charge);
  button.down();
  assert.equal(button.claims(0, 0), false, 'a second finger is ignored while charging');
  assert.equal(button.read().kick, null);
  clock.ms = CHARGE_MS;
  button.up();
  assert.equal(button.read().kick, 1);
  assert.equal(button.read().kick, null);
});

test('DashButton yields one dash per press inside its circle', () => {
  const button = new DashButton(() => [100, 100]);
  assert.equal(button.claims(100 + CONFIG.touch.dashRadius + 1, 100), false);
  assert.equal(button.claims(100, 100), true);
  button.down();
  assert.equal(button.read().dash, true);
  assert.equal(button.read().dash, false);
});

test('Controller passes a dash from any source', () => {
  assert.equal(new Controller([source(0, 0), source(0, 0, null, true)]).read().dash, true);
  assert.equal(new Controller([source(0, 0)]).read().dash, false);
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
  const sfx = { kick: () => played.push('kick'), goal: (s) => played.push(`goal${s.sc.join('-')}`), whistle: (n = 1) => played.push(`whistle${n}`) };
  const fx = new EffectWatcher(sfx);
  fx.observe(state({ ph: 'countdown' }));
  fx.observe(state({ ph: 'play' }));
  fx.observe(state({ kc: 1 }));
  fx.observe(state({ kc: 1, sc: [1, 0], ph: 'goal' }));
  fx.observe(state({ kc: 1, sc: [1, 0], ph: 'end' }));
  assert.deepEqual(played, ['whistle1', 'kick', 'goal1-0', `whistle${CONFIG.sound.endWhistles}`]);
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

test('Confetti bursts, falls and disappears after its lifetime', () => {
  const confetti = new Confetti(() => 0.5);
  confetti.burst(100, 100, CONFIG.colors[0]);
  assert.equal(confetti.pieces.length, CONFIG.confetti.count);
  confetti.step(0.1);
  assert.ok(confetti.pieces[0].y < 100, 'thrown upward first');
  confetti.step(CONFIG.confetti.life);
  assert.equal(confetti.pieces.length, 0);
});
