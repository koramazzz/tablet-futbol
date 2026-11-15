import { clampMagnitude } from '../core/utils.js';
import { NO_INPUT } from './input.js';

/**
 * Merges several input sources into one input (see NO_INPUT for its shape).
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
    let { x, y, kick, dash } = NO_INPUT;
    for (const source of this.sources) {
      const r = source.read();
      x += r.x;
      y += r.y;
      kick = kick ?? r.kick;
      dash = dash || r.dash;
    }
    [x, y] = clampMagnitude(x, y);
    const sign = this.invert ? -1 : 1;
    return { x: x * sign, y: y * sign, kick, dash };
  }

  dispose() {
    this.sources.forEach(s => s.dispose?.());
  }
}
