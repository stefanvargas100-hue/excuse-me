// Initial targets: median bot finishes across three seeded 60 Hz harness races, rounded up.
export const MEDAL_TIMES = {
  airport: { bronze: 165, silver: 125, gold: 118 },
  nyc: { bronze: 211, silver: 181, gold: 134 },
  shibuya: { bronze: 107, silver: 92, gold: 75 },
  park: { bronze: 178, silver: 143, gold: 115 },
  bridge: { bronze: 208, silver: 176, gold: 136 },
  subway: { bronze: 153, silver: 138, gold: 121 }
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
