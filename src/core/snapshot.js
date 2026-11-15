import { CONFIG } from '../config.js';
import { cleanName, finiteOr, safeColor } from './utils.js';

const isPoint = (a) => Array.isArray(a) && a.length >= 2 && a.every(Number.isFinite);
const isPair = (a, check) => Array.isArray(a) && a.length === 2 && a.every(check);

/** Checks the shape of a snapshot received from the other tablet. */
export function isValidState(s) {
  return !!s && typeof s.ph === 'string' && isPoint(s.b)
    && isPair(s.p, isPoint) && isPair(s.g, isPoint)
    && Array.isArray(s.sc) && isPair(s.tm, t => !!t && typeof t === 'object');
}

/** Normalises untrusted fields of a valid snapshot. */
export function sanitizeState(s) {
  return {
    ...s,
    tm: s.tm.map((t, i) => ({ n: cleanName(t.n, CONFIG.defaultNames[i]), c: safeColor(t.c, CONFIG.colors[i]) })),
    sc: [0, 1].map(i => finiteOr(s.sc[i], 0)),
    pt: finiteOr(s.pt, 0),
    tl: finiteOr(s.tl, 0),
    kc: finiteOr(s.kc, 0),
    lg: finiteOr(s.lg, -1),
  };
}
