
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

export let vibOn = (() => { try { return localStorage.getItem('excuseme_vib') !== '0'; } catch (e) { return true; } })();

export function buzz(pattern) { if (!vibOn) return; try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} }

export function setVibOn(v) { vibOn = v; }
