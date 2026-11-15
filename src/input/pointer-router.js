/** Routes multi-touch pointers on the canvas to the on-screen controls. */
export class PointerRouter {
  constructor(canvas) {
    this.controls = [];
    this.active = new Map();
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    canvas.addEventListener('pointerdown', (e) => {
      const [x, y] = pos(e);
      const control = this.controls.find(c => c.claims(x, y));
      if (!control) return;
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
      this.active.set(e.pointerId, control);
      control.down(x, y);
    });
    canvas.addEventListener('pointermove', (e) => this.active.get(e.pointerId)?.move(...pos(e)));
    const end = (e) => {
      this.active.get(e.pointerId)?.up();
      this.active.delete(e.pointerId);
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  setControls(list) {
    this.active.forEach(c => c.up());
    this.active.clear();
    this.controls = list;
  }
}
