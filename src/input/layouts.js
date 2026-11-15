import { CONFIG } from '../config.js';
import { Joystick } from './joystick.js';
import { KickButton } from './kick-button.js';

/** Where each player's thumbstick zone and kick button sit, given the viewport `view` ({W, H}). */
const LAYOUTS = {
  online: (view, t, hud) => [{
    zone: (x, y) => x < view.W * t.onlineSplit && y > hud,
    home: () => [t.inset, view.H - t.inset],
    kick: () => [view.W - t.inset, view.H - t.inset],
  }],
  local: (view, t, hud) => [
    {
      zone: (x, y) => x < view.W * t.localSplit && y > hud,
      home: () => [t.inset, view.H - t.inset],
      kick: () => [t.inset, hud + t.inset],
    },
    {
      zone: (x, y) => x > view.W * (1 - t.localSplit) && y > hud,
      home: () => [view.W - t.inset, view.H - t.inset],
      kick: () => [view.W - t.inset, hud + t.inset],
    },
  ],
};

/** Returns one [Joystick, KickButton] pair per player for the given layout name. */
export function buildTouchPads(layout, view) {
  return LAYOUTS[layout](view, CONFIG.touch, CONFIG.view.hudHeight)
    .map(p => [new Joystick(p.zone, p.home), new KickButton(p.kick)]);
}
