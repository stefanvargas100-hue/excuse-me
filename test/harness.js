// Loads game.js headlessly (no browser) with a stub DOM so the simulation can be driven from tests.
const fs = require('fs'), path = require('path'), vm = require('vm');

// A stand-in for any DOM/canvas/audio object: every property is another stub, every call returns a stub.
function stub() {
  const fn = function () { return stub(); };
  return new Proxy(fn, {
    get: (t, k) => {
      if (k === Symbol.toPrimitive) return () => 0;
      if (k === 'then') return undefined;
      if (k === 'width' || k === 'height' || k === 'length' || k === 'bottom') return 100;
      if (k === 'hidden') return false;
      if (k === 'measureText') return () => ({ width: 10 });
      return t[k] !== undefined ? t[k] : (t[k] = stub());
    },
    set: (t, k, v) => { t[k] = v; return true; },
    apply: () => stub(),
    construct: () => stub()
  });
}

function load(sourceFile) {
  const code = fs.readFileSync(sourceFile || path.join(__dirname, '..', 'game.js'), 'utf8');
  const store = { excuseme_tut: '1' };   // skip the first-run tutorial
  const win = {
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 2,
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
    AudioContext: undefined, webkitAudioContext: undefined
  };
  const sandbox = {
    window: win, console, Math, Date, JSON, Object, Array, Set, Map, Number, String, Symbol, Promise, Float32Array, Float64Array, Uint8Array, Int32Array, Uint32Array,
    setTimeout, clearTimeout, setInterval() { return 0; }, clearInterval() {},
    performance: { now: () => 0 },
    document: { getElementById: () => stub(), querySelectorAll: () => [], querySelector: () => stub(), createElement: () => stub(), createTextNode: () => stub(), createDocumentFragment: () => stub(), addEventListener() {}, body: stub(), documentElement: stub(), hidden: false, fonts: { ready: Promise.resolve() } },
    navigator: { vibrate: () => true, userAgent: 'node' },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    requestAnimationFrame() { return 0; }, cancelAnimationFrame() {}, addEventListener() {}, removeEventListener() {}
  };
  sandbox.globalThis = sandbox; Object.assign(win, sandbox.window);
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'game.js' });
  return sandbox.window.__excuse || win.__excuse;
}
module.exports = { load, stub };
