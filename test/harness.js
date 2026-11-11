// Loads game.js headlessly (no browser) with a stub DOM so the simulation can be driven from tests.
const path = require('path'), vm = require('vm'), esbuild = require('esbuild');

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

// load(file, { seed }): with a seed, Math.random inside the game is a fixed sequence, so a test can replay the same crowd.
function load(sourceFile, opts) {
  const listeners = [];   // window listeners, so tests can fire keyboard events like a browser would
  const docListeners = [], intervals = new Map(); let now = 1000, timerId = 0;
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      const values = { hidden: id !== 'start', disabled: false, textContent: '' }, events = new Map();
      values.addEventListener = (type, fn, options) => { if (!events.has(type)) events.set(type, []); events.get(type).push({ fn, options }); };
      values.dispatchEvent = ev => { for (const { fn, options } of events.get(ev.type) || []) { ev.passive = options?.passive === true; fn(ev); } return !ev.defaultPrevented; };
      values.focus = () => { sandbox.document.activeElement = element(id); };
      values.blur = () => { if (sandbox.document.activeElement === element(id)) sandbox.document.activeElement = sandbox.document.body; };
      values.click = async () => { if (!values.disabled) for (const { fn } of events.get('click') || []) await fn({ preventDefault() {} }); };
      elements.set(id, new Proxy(stub(), { get: (target, key) => key in values ? values[key] : target[key], set: (_, key, value) => { values[key] = value; return true; } }));
    }
    return elements.get(id);
  }
  // the game is ES modules; bundle them into one script so each load() gets its own independent copy of the game state
  const code = esbuild.buildSync({ ...(opts?.seeded ? { stdin: { contents: "import '../src/main.js'; import {extendClassicPickups} from '../src/sim/powerups.js'; import {R,setR,mulberry32} from '../src/config/util.js'; Object.assign(window.__excuse,{extendClassicPickups,setR,mulberry32,random:()=>R()});", resolveDir: __dirname } } : { entryPoints: [sourceFile || path.join(__dirname, '..', 'src', 'main.js')] }), bundle: true, format: 'iife', write: false, logLevel: 'silent' }).outputFiles[0].text;
  const store = { excuseme_tut: '1' };   // skip the first-run tutorial
  const win = {
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 2,
    addEventListener(type, fn) { listeners.push([type, fn]); }, removeEventListener() {},
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
  let wallTime = opts?.date?.getTime();
  if (wallTime !== undefined) sandbox.Date = class extends Date { constructor(...a) { super(...(a.length ? a : [wallTime])); } static now() { return wallTime; } };
  if (opts && opts.clock) {
    sandbox.Date = class extends Date { static now() { return now; } };
    sandbox.setInterval = fn => { intervals.set(++timerId, fn); return timerId; };
    sandbox.clearInterval = id => intervals.delete(id);
  }
  sandbox.document.addEventListener = (type, fn) => docListeners.push([type, fn]);
  if (opts && opts.dom) sandbox.document.getElementById = element;
  vm.createContext(sandbox);
  if (opts && opts.seed !== undefined) vm.runInContext('(function(){ var s = ' + (opts.seed >>> 0) + ' || 1; Math.random = function(){ s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })()', sandbox);
  vm.runInContext(code, sandbox, { filename: 'game-bundle.js' });
  const E = sandbox.window.__excuse || win.__excuse;
  E.setDate = date => { wallTime = date.getTime(); };
  E.storage = store;   // the fake localStorage, so tests can pick settings such as bot difficulty
  let lobbyTime = opts?.lobbyOffset || 0;
  if (E.useLobbyClock) E.useLobbyClock(() => lobbyTime);
  const gameTick = E.tick;
  E.tick = dt => { if (!opts?.manualLobbyClock && E.S?.duel?.startRemaining && E.S.race.countT > 0) lobbyTime += dt * 1000; gameTick(dt); };
  E.fire = (type, ev) => { for (const [t, fn] of listeners) if (t === type) fn(Object.assign({ preventDefault() {}, repeat: false }, ev)); };
  E.advance = ms => { now += ms; lobbyTime += ms; for (const fn of [...intervals.values()]) fn(); };
  E.visibility = hidden => { sandbox.document.hidden = hidden; for (const [t, fn] of docListeners) if (t === 'visibilitychange') fn(); };
  E.element = element;
  return E;
}
async function readyPlayers(games) {
  for (let i = 0; i < 80; i++) await Promise.resolve();
  for (const g of games) {
    if (!g.setRoomReady(true)) throw new Error('Fixture could not ready a player: ' + JSON.stringify(g.roomLobbyState()));
  }
  for (let i = 0; i < 80; i++) await Promise.resolve();
}
module.exports = { load, stub, readyPlayers };
