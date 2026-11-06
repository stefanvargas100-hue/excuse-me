
export const $ = id => document.getElementById(id);

export const cv = $('game');

export let ctx = cv.getContext('2d');

export function setCtx(v) { ctx = v; }
