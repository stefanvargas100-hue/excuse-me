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
export const cupPresets = levels => stageGroups(levels).filter(g => g.indices.length >= 2);
