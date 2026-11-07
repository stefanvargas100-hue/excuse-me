// Review tool: add ?debug to the address (from the home-screen icon too) to see the sizes the phone reports. Changes nothing in the game.
export function openDebug() {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:6px;top:calc(env(safe-area-inset-top,0px) + 6px);z-index:99999;background:rgba(0,0,0,.78);color:#7CFC9A;font:12px/1.35 ui-monospace,Menlo,monospace;padding:8px;border-radius:8px;white-space:pre;pointer-events:none;max-width:96vw';
  document.body.appendChild(box);
  const mark = (css, label) => { const m = document.createElement('div'); m.style.cssText = 'position:fixed;left:0;right:0;z-index:99998;color:#fff;font:700 12px sans-serif;text-align:center;pointer-events:none;' + css; m.textContent = label; document.body.appendChild(m); };
  mark('top:0;height:14px;background:#d00', 'TOP EDGE of the page (red)');
  mark('bottom:0;height:14px;background:#00d', 'BOTTOM EDGE of the page (blue)');
  const probe = (css) => { const p = document.createElement('div'); p.style.cssText = 'position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;' + css; document.body.appendChild(p); const h = p.offsetHeight; p.remove(); return h; };
  const inset = side => { const p = document.createElement('div'); p.style.cssText = 'position:fixed;visibility:hidden;padding-' + side + ':env(safe-area-inset-' + side + ',0px)'; document.body.appendChild(p); const v = parseFloat(getComputedStyle(p)['padding' + side[0].toUpperCase() + side.slice(1)]) || 0; p.remove(); return v; };
  const bg = el => getComputedStyle(el).backgroundColor;
  const show = () => {
    const w = window, s = w.screen || {}, vv = w.visualViewport, cv = document.getElementById('game');
    const standalone = (navigator.standalone === true) || (w.matchMedia && w.matchMedia('(display-mode: standalone)').matches);
    box.textContent = [
      'standalone: ' + standalone + '   dpr: ' + w.devicePixelRatio,
      'innerW x innerH: ' + w.innerWidth + ' x ' + w.innerHeight,
      'outerH: ' + w.outerHeight + '   screen: ' + s.width + ' x ' + s.height,
      'visualViewport: ' + (vv ? Math.round(vv.width) + ' x ' + Math.round(vv.height) + ' top ' + Math.round(vv.offsetTop) : 'none'),
      'html clientH: ' + document.documentElement.clientHeight + '   body: ' + document.body.offsetHeight,
      '100vh: ' + probe('height:100vh') + '   100dvh: ' + probe('height:100dvh') + '   100svh: ' + probe('height:100svh') + '   100lvh: ' + probe('height:100lvh'),
      '100%: ' + probe('height:100%'),
      'safe top/bottom: ' + inset('top') + ' / ' + inset('bottom') + '   left/right: ' + inset('left') + ' / ' + inset('right'),
      'canvas css: ' + (cv ? cv.clientWidth + ' x ' + cv.clientHeight : '-') + '   bitmap: ' + (cv ? cv.width + ' x ' + cv.height : '-'),
      'bg html: ' + bg(document.documentElement) + '   body: ' + bg(document.body),
      'viewport meta: ' + ((document.querySelector('meta[name=viewport]') || {}).content || 'none')
    ].join('\n');
  };
  show(); setInterval(show, 700); window.addEventListener('resize', show); window.addEventListener('orientationchange', show);
}
