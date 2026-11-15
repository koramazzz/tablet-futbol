import { CONFIG } from '../config.js';
import { isValidState, sanitizeState } from '../core/snapshot.js';
import { round } from '../core/utils.js';
import { Session } from './session.js';

const INPUT_DIGITS = 2;

/**
 * Sends this tablet's input to the host and shows the host's snapshots.
 * The guest plays team 1 and sees the pitch rotated, so it attacks to the right too.
 * Kicks and rematch requests are counters, so a dropped message loses nothing.
 */
export class GuestSession extends Session {
  constructor(link, profile, controller) {
    super({ controllers: [controller], link, flip: true, myTeam: 1 });
    this.profile = profile;
    this.kicks = 0;
    this.rematches = 0;
  }

  frame() {
    const input = this.controllers[0].read();
    if (input.kick) this.kicks++;
    this.link.send({
      pv: CONFIG.net.protocol, name: this.profile.name, color: this.profile.color,
      ix: round(input.x, INPUT_DIGITS), iy: round(input.y, INPUT_DIGITS), k: this.kicks, rm: this.rematches,
    });
    if (!this.link.isOpen) return { error: CONFIG.text.connectionLost };
    const s = this.link.latest;
    if (!isValidState(s)) return { connecting: true };
    return { state: sanitizeState(s) };
  }

  rematch() { this.rematches++; }
}
