// Which copy of the game this page is. The playtest lives in a folder of the live site, so it shares storage with it and must keep apart.
export const PLAYTEST = typeof location !== 'undefined' && /\/playtest\//.test(location.pathname || '');
/* global __BUILD_ID__ */
export const BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';
