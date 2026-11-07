/* ---------- the start line of a live race ----------
   Everyone stands on the same line (so nobody starts closer to the finish), spread across the street in the order of the room list.
   Every phone works this out from the same list, so each phone puts each racer in the same place. */
const SPACING = 1.2;   // metres between neighbours; squeezed a little when 8 racers share a narrow street

export function startSlot(index, count, half) {
  const lim = half - 0.5, n = Math.max(1, count);
  const gap = n > 1 ? Math.min(SPACING, (2 * lim - 0.2) / (n - 1)) : 0;
  return { x: (index - (n - 1) / 2) * gap, z: 0 };
}
