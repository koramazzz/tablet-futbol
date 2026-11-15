import { CONFIG } from '../config.js';
import { Bot } from '../core/bot.js';
import { Match } from '../core/match.js';
import { otherColor } from '../core/utils.js';
import { Session } from './session.js';

const BOT_TEAM = 1;

/** One player against the computer. */
export class SoloSession extends Session {
  constructor(profile, controller, level) {
    super({ controllers: [controller], myTeam: 0, pausable: true });
    const opponent = { name: CONFIG.text.botName, color: otherColor(profile.color) };
    this.match = new Match([profile, opponent], profile.minutes);
    this.bot = new Bot(BOT_TEAM, level);
  }

  frame(dt) {
    this.match.advance(dt, [this.controllers[0].read(), this.bot.decide(this.match, dt)]);
    return { state: this.match.snapshot() };
  }

  rematch() { this.match.restart(); }
}
