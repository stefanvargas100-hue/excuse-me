// Measurements use CSS pixels; ignore at most one pixel of layout rounding.
export function fitProblems({ boxes = [], controls = [] }, { width, height }) {
  const problems = [];
  for (const b of boxes) {
    if (b.scrollWidth > b.clientWidth + 1 || b.left < -1 || b.right > width + 1)
      problems.push({ element: b.element, problem: 'horizontal overflow' });
    if (b.scrollHeight > b.clientHeight + 1 || b.top < -1 || b.bottom > height + 1)
      problems.push({ element: b.element, problem: 'vertical overflow' });
  }
  for (const b of controls) {
    if (b.left < 0 || b.top < 0 || b.right > width || b.bottom > height)
      problems.push({ element: b.element, problem: 'control off-screen' });
  }
  return problems;
}
