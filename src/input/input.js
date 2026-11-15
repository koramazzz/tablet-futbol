/**
 * The shape every input source reads: a direction, `kick` (null, or a shot power from
 * 0 to 1) and `dash` (true on the frame a dash was requested).
 */
export const NO_INPUT = Object.freeze({ x: 0, y: 0, kick: null, dash: false });
