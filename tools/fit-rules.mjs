// Scroll dimensions allow two pixels of font/layout rounding; control edges are strict.
export function fitProblems({ boxes = [], controls = [] }, { width, height }) {
  const problems = [];
  const add = (b, problem, overflow) => problems.push({ element: b.element, text: (b.text || '').slice(0, 30), problem, overflow });
  for (const b of boxes) {
    const x = Math.max(b.scrollWidth - b.clientWidth > 2 ? b.scrollWidth - b.clientWidth : 0, -b.left, b.right - width);
    const y = Math.max(b.scrollHeight - b.clientHeight > 2 ? b.scrollHeight - b.clientHeight : 0, -b.top, b.bottom - height);
    if (x > 1) add(b, 'horizontal overflow', x);
    if (y > 1) add(b, 'vertical overflow', y);
  }
  for (const b of controls) {
    const outside = Math.max(-b.left, -b.top, b.right - width, b.bottom - height);
    if (outside > 0) add(b, 'control off-screen', outside);
    if (b.panel) {
      const overflow = Math.max(b.panel.left - b.left, b.right - b.panel.right);
      if (overflow > 0) add(b, 'control outside panel', overflow);
    }
  }
  return problems;
}
