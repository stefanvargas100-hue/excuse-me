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
    const outside = Math.max(-b.left, b.right - width, b.canScrollY ? 0 : Math.max(-b.top, b.bottom - height));
    const textOverflow = Math.max(b.left - (b.textLeft ?? b.left), (b.textRight ?? b.right) - b.right);
    if (textOverflow > 1) add(b, 'text outside control', textOverflow);
    if (outside > 0) add(b, 'control off-screen', outside);
    for (const word of b.splitWords || []) add(b, 'word split across lines: ' + word, 0);
    if (b.panel) {
      const overflow = Math.max(b.panel.left - b.left, b.right - b.panel.right, (b.panel.top ?? b.top) - b.top, b.bottom - (b.panel.bottom ?? b.bottom));
      if (overflow > 0) add(b, 'control outside panel', overflow);
    }
  }
  return problems;
}
