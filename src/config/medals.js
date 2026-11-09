// Targets: median bot finishes across three seeded 60 Hz ordinary races with lane avoidance and a 6 s slipstream cooldown, rounded up.
export const MEDAL_TIMES = {
  airport: { bronze: 153, silver: 137, gold: 120 },
  nyc: { bronze: 215, silver: 176, gold: 154 },
  shibuya: { bronze: 103, silver: 94, gold: 82 },
  park: { bronze: 171, silver: 148, gold: 117 },
  bridge: { bronze: 202, silver: 166, gold: 144 },
  subway: { bronze: 159, silver: 124, gold: 99 }
};

export function medalFor(stageId, seconds) {
  const times = MEDAL_TIMES[stageId];
  if (!times || !Number.isFinite(seconds) || seconds <= 0) return null;
  for (const medal of ['gold', 'silver', 'bronze']) if (seconds <= times[medal]) return medal;
  return null;
}

// Zero is the existing save's sentinel for no race best: start at Bronze.
export function nextMedal(stageId, seconds) {
  const times = MEDAL_TIMES[stageId];
  if (!times) return null;
  const earned = medalFor(stageId, seconds);
  const medal = earned === 'gold' ? null : earned === 'silver' ? 'gold' : earned === 'bronze' ? 'silver' : 'bronze';
  return medal ? { medal, seconds: times[medal] } : null;
}
