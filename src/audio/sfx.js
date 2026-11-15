import { CONFIG } from '../config.js';

const SILENT_GAIN = 0.001;
const STOP_PADDING = 0.02;

/** Tiny synthesized sound effects (no audio files needed). */
export class Sfx {
  /** Must be called from a user gesture so browsers allow audio. */
  unlock() {
    try {
      this.ctx ??= new (globalThis.AudioContext || globalThis.webkitAudioContext)();
      this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  tone({ freq, to = freq, dur, type, vol }, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(SILENT_GAIN, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + STOP_PADDING);
  }

  kick() { CONFIG.sound.kick.forEach(n => this.tone(n)); }

  whistle(times = 1) {
    const w = CONFIG.sound.whistle;
    for (let i = 0; i < times; i++) this.tone(w, i * w.gap);
  }

  goal() {
    const g = CONFIG.sound.goal;
    g.notes.forEach((freq, i) => this.tone({ ...g, freq }, i * g.gap));
  }
}
