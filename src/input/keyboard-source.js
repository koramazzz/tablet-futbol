import { unit } from '../core/utils.js';

/** Keyboard controls for testing on a computer. `target` defaults to window. */
export class KeyboardSource {
  constructor(map, target = globalThis) {
    this.map = map;
    this.target = target;
    this.held = new Set();
    this.pending = false;
    const codes = Object.values(map);
    this.onDown = (e) => {
      if (!codes.includes(e.code)) return;
      e.preventDefault();
      if (e.code === map.kick && !e.repeat) this.pending = true;
      this.held.add(e.code);
    };
    this.onUp = (e) => this.held.delete(e.code);
    target.addEventListener('keydown', this.onDown);
    target.addEventListener('keyup', this.onUp);
  }

  read() {
    const m = this.map, on = (code) => (this.held.has(code) ? 1 : 0);
    const [x, y] = unit(on(m.right) - on(m.left), on(m.down) - on(m.up));
    const kick = this.pending;
    this.pending = false;
    return { x, y, kick };
  }

  dispose() {
    this.target.removeEventListener('keydown', this.onDown);
    this.target.removeEventListener('keyup', this.onUp);
  }
}
