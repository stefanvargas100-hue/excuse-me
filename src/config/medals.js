// Initial targets: median bot finishes across three seeded harness races, rounded up.
export const MEDAL_TIMES = {
  airport: { bronze: 152, silver: 134, gold: 107 },
  nyc: { bronze: 218, silver: 170, gold: 131 },
  shibuya: { bronze: 109, silver: 82, gold: 76 },
  park: { bronze: 173, silver: 141, gold: 112 },
  bridge: { bronze: 184, silver: 154, gold: 124 }
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
