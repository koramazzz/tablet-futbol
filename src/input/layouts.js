import { CONFIG } from '../config.js';
import { DashButton } from './dash-button.js';
import { Joystick } from './joystick.js';
import { KickButton } from './kick-button.js';

/**
 * Touch areas per player, given the viewport `view` ({W, H}): a zone for the stick, a zone
 * for kicking and the centre of the round dash button, which sits inside the kick zone.
 */
const LAYOUTS = {
  online: (view, t, hud) => [{
    stickZone: (x, y) => y > hud && x < view.W * t.onlineSplit,
    kickZone: (x, y) => y > hud && x >= view.W * t.onlineSplit,
    stickHome: () => [t.inset, view.H - t.inset],
    kickHome: () => [view.W - t.inset, view.H - t.inset],
    dashHome: () => [view.W - t.inset, view.H - t.inset - t.dashOffset],
  }],
  local: (view, t, hud) => {
    const kickBottom = () => hud + (view.H - hud) * t.localKickSplit;
    const side = (inSide, edgeX, towardCentre) => ({
      stickZone: (px, py) => inSide(px) && py >= kickBottom(),
      kickZone: (px, py) => inSide(px) && py > hud && py < kickBottom(),
      stickHome: () => [edgeX(), view.H - t.inset],
      kickHome: () => [edgeX(), hud + t.inset],
      dashHome: () => [edgeX() + towardCentre * t.dashOffset, hud + t.inset],
    });
    return [
      side(px => px < view.W * t.localSplit, () => t.inset, 1),
      side(px => px > view.W * (1 - t.localSplit), () => view.W - t.inset, -1),
    ];
  },
};

/** Returns one [Joystick, DashButton, KickButton] set per player for the given layout name. */
export function buildTouchPads(layout, view) {
  return LAYOUTS[layout](view, CONFIG.touch, CONFIG.view.hudHeight).map(p => {
    const dash = new DashButton(p.dashHome);
    const kick = new KickButton((x, y) => p.kickZone(x, y) && !dash.contains(x, y), p.kickHome);
    return [new Joystick(p.stickZone, p.stickHome), dash, kick];
  });
}
