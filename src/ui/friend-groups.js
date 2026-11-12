// Original stage indices are preserved across location groups and Cup race order.
export function stageGroups(levels) {
  const groups = [];
  levels.forEach((level, index) => {
    let group = groups.find(g => g.city === level.city);
    if (!group) { group = { city: level.city, indices: [] }; groups.push(group); }
    group.indices.push(index);
  });
  return groups;
}
export function groupLabel(levels, group, selection, cup) {
  const picks = cup ? selection.filter(i => group.indices.includes(i)) : group.indices.filter(i => i === selection);
  return group.city + (picks.length ? ': ' + picks.map(i => (cup ? (selection.indexOf(i) + 1) + '. ' : '') + levels[i].name).join(', ') : '');
}
export const groupAvailable = (group, cup) => !cup || group.indices.some(i => i <= 5);
export function cupPick(picks, index) {
  if (picks.includes(index)) return picks.filter(i => i !== index);
  return picks.length < 4 && index >= 0 && index <= 5 ? [...picks, index] : [...picks];
}
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
