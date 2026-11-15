import { CONFIG } from '../config.js';
import { Match } from '../core/match.js';
import { otherColor } from '../core/utils.js';
import { Session } from './session.js';

/** Both players on one tablet. */
export class LocalSession extends Session {
  constructor(profile, controllers) {
    super({ controllers, pausable: true });
    const second = { name: CONFIG.defaultNames[1], color: otherColor(profile.color) };
    this.match = new Match([profile, second], profile.minutes);
  }

  frame(dt) {
    this.match.advance(dt, this.controllers.map(c => c.read()));
    return { state: this.match.snapshot() };
  }

  rematch() { this.match.restart(); }
}
