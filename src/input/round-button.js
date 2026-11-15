const FONT = "'Baloo 2', sans-serif";
const LABEL_RATIO = 0.42;
const ALPHA = { idle: 0.4, pressed: 0.7 };

/** Draws a translucent round touch button with a centred label. */
export function drawRoundButton(ctx, { cx, cy, r, label, pressed }) {
  ctx.globalAlpha = pressed ? ALPHA.pressed : ALPHA.idle;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0f172a';
  ctx.font = `800 ${Math.round(r * LABEL_RATIO)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy + 2);
}
