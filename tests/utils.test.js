import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { clamp, clampMagnitude, cleanName, finiteOr, format, formatClock, otherColor, randomCode, round, safeColor, unit } from '../src/core/utils.js';

test('clamp keeps values in range', () => {
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(-1, 0, 3), 0);
  assert.equal(clamp(2, 0, 3), 2);
});

test('round keeps the given number of digits', () => {
  assert.equal(round(1.2345, 2), 1.23);
});

test('unit normalises and handles the zero vector', () => {
  const [x, y] = unit(3, 4);
  assert.ok(Math.abs(x - 0.6) < 1e-9 && Math.abs(y - 0.8) < 1e-9);
  assert.deepEqual(unit(0, 0), [0, 0]);
});

test('clampMagnitude only shrinks long vectors', () => {
  assert.deepEqual(clampMagnitude(0.3, 0.4), [0.3, 0.4]);
  const [x, y] = clampMagnitude(3, 4);
  assert.ok(Math.abs(Math.hypot(x, y) - 1) < 1e-9);
});

test('format fills placeholders', () => {
  assert.equal(format('{name} kazandı', { name: 'Ali' }), 'Ali kazandı');
});

test('finiteOr rejects NaN, Infinity and non-numbers', () => {
  assert.equal(finiteOr(NaN, 1), 1);
  assert.equal(finiteOr(Infinity, 1), 1);
  assert.equal(finiteOr('3', 1), 1);
  assert.equal(finiteOr(2, 1), 2);
});

test('cleanName trims, strips invisible characters and limits length', () => {
  assert.equal(cleanName('  Ali​ ', 'x'), 'Ali');
  assert.equal(cleanName('a'.repeat(50), 'x').length, CONFIG.maxNameLength);
  assert.equal(cleanName('', 'Oyuncu'), 'Oyuncu');
  assert.equal(cleanName(undefined, 'Oyuncu'), 'Oyuncu');
});

test('safeColor only accepts palette colours', () => {
  assert.equal(safeColor(CONFIG.colors[2], 'x'), CONFIG.colors[2]);
  assert.equal(safeColor('javascript:alert(1)', 'x'), 'x');
});

test('otherColor never returns the taken colour', () => {
  CONFIG.colors.forEach(c => assert.notEqual(otherColor(c), c));
});

test('formatClock shows m:ss rounded up', () => {
  assert.equal(formatClock(125), '2:05');
  assert.equal(formatClock(0.2), '0:01');
  assert.equal(formatClock(-3), '0:00');
});

test('randomCode always has the configured number of digits', () => {
  assert.equal(randomCode(() => 0).length, CONFIG.net.codeLength);
  assert.equal(randomCode(() => 0.9999999).length, CONFIG.net.codeLength);
});
