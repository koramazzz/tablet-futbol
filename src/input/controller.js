import { clampMagnitude } from '../core/utils.js';

/**
 * Merges several input sources into one {x, y, kick}; kick is null or a shot power from 0 to 1.
 * `invert` mirrors the direction for a player who sees the pitch rotated 180°.
 */
export class Controller {
  constructor(sources, invert = false) {
    this.sources = sources;
    this.invert = invert;
  }

  get touchControls() {
    return this.sources.filter(s => typeof s.claims === 'function');
  }

  read() {
    let x = 0, y = 0, kick = null;
    for (const source of this.sources) {
      const r = source.read();
      x += r.x;
      y += r.y;
      kick = kick ?? r.kick;
    }
    [x, y] = clampMagnitude(x, y);
    const sign = this.invert ? -1 : 1;
    return { x: x * sign, y: y * sign, kick };
  }

  dispose() {
    this.sources.forEach(s => s.dispose?.());
  }
}
