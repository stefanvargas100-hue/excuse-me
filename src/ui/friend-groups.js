export { stageGroups, cupPresets } from '../sim/cup-presets.js';
export function groupLabel(levels, group, selection, cup) {
  const picks = cup ? selection.filter(i => group.indices.includes(i)) : group.indices.filter(i => i === selection);
  return group.city + (picks.length ? ': ' + picks.map(i => (cup ? (selection.indexOf(i) + 1) + '. ' : '') + levels[i].name).join(', ') : '');
}
export const groupAvailable = (group, cup) => !cup || group.indices.length >= 2;
export function syncBotOptions(select, players, bots, createOption) {
  const freeSeats = String(8 - players);
  if (select.dataset.freeSeats !== freeSeats) {
    select.textContent = '';
    for (const value of ['fill', ...Array.from({ length: Number(freeSeats) + 1 }, (_, i) => String(i))]) {
      const option = createOption(); option.value = value;
      option.textContent = value === 'fill' ? 'Fill to 8' : value === '0' ? 'No bots' : value + ' bots';
      select.appendChild(option);
    }
    select.dataset.freeSeats = freeSeats;
  }
  select.value = String(bots);
}
