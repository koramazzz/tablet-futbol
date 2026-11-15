import { CONFIG } from '../config.js';
import { Joystick } from './joystick.js';
import { KickButton } from './kick-button.js';

/**
 * Touch zones per player, given the viewport `view` ({W, H}). A player's stick and kick
 * zones never overlap, so a finger anywhere in a zone works.
 */
const LAYOUTS = {
  online: (view, t, hud) => [{
    stickZone: (x, y) => y > hud && x < view.W * t.onlineSplit,
    kickZone: (x, y) => y > hud && x >= view.W * t.onlineSplit,
    stickHome: () => [t.inset, view.H - t.inset],
    kickHome: () => [view.W - t.inset, view.H - t.inset],
  }],
  local: (view, t, hud) => {
    const kickBottom = () => hud + (view.H - hud) * t.localKickSplit;
    const side = (inSide, x) => ({
      stickZone: (px, py) => inSide(px) && py >= kickBottom(),
      kickZone: (px, py) => inSide(px) && py > hud && py < kickBottom(),
      stickHome: () => [x(), view.H - t.inset],
      kickHome: () => [x(), hud + t.inset],
    });
    return [
      side(px => px < view.W * t.localSplit, () => t.inset),
      side(px => px > view.W * (1 - t.localSplit), () => view.W - t.inset),
    ];
  },
};

/** Returns one [Joystick, KickButton] pair per player for the given layout name. */
export function buildTouchPads(layout, view) {
  return LAYOUTS[layout](view, CONFIG.touch, CONFIG.view.hudHeight)
    .map(p => [new Joystick(p.stickZone, p.stickHome), new KickButton(p.kickZone, p.kickHome)]);
}
