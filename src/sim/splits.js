// Distances and times are in metres and seconds; samples start at time zero.
export const splitPoints = goal => [goal * 0.25, goal * 0.5, goal * 0.75];

export function timeAtZ(pts, step, z) {
  if (pts.length < 2) return null;
  if (pts[1] >= z) return 0;
  for (let i = 3; i < pts.length; i += 2) {
    if (pts[i] >= z) return ((i - 3) / 2 + (z - pts[i - 2]) / (pts[i] - pts[i - 2])) * step;
  }
  return null;
}

export function splitText(delta) {
  const magnitude = Math.abs(delta).toFixed(1);
  return magnitude === '0.0' ? '0.0' : (delta < 0 ? '-' : '+') + magnitude;
}

// Follows the displayed text, so a split that rounds to level is never shown as behind.
export const splitColor = delta => (splitText(delta).startsWith('+') ? '#ff6b6b' : '#7ee081');
