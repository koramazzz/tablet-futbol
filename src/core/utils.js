import { CONFIG } from '../config.js';

const INVISIBLE_CHARS = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯]/g;

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const round = (v, digits) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

export const unit = (x, y) => {
  const m = Math.hypot(x, y);
  return m > 0 ? [x / m, y / m] : [0, 0];
};

export const clampMagnitude = (x, y, max = 1) => {
  const m = Math.hypot(x, y);
  return m > max ? [x / m * max, y / m * max] : [x, y];
};

export const format = (template, vars) => template.replace(/\{(\w+)\}/g, (_, key) => vars[key]);

export const finiteOr = (v, fallback) => (Number.isFinite(v) ? v : fallback);

export const cleanName = (s, fallback) =>
  String(s ?? '').replace(INVISIBLE_CHARS, '').trim().slice(0, CONFIG.maxNameLength) || fallback;

export const safeColor = (c, fallback) => (CONFIG.colors.includes(c) ? c : fallback);

export const otherColor = (taken) => CONFIG.colors.find(c => c !== taken);

export const formatClock = (seconds) => {
  const s = Math.ceil(Math.max(0, seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const randomCode = (random = Math.random) => {
  const low = 10 ** (CONFIG.net.codeLength - 1);
  return String(low + Math.floor(random() * 9 * low));
};
