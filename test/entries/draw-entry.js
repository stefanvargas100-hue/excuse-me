// Test entry: draws every body x face x view through the real figure code on a stub canvas.
import { FACE_PARTS } from '../../src/config/faces.js';
import { drawPerson } from '../../src/render/figures.js';
import { applyBuild, dress } from '../../src/sim/people.js';

window.__excuse = {
  drawAll() {
    let n = 0;
    for (const body of ['m', 'f']) for (const eyes of FACE_PARTS.eyes) for (const nose of FACE_PARTS.nose) for (const mouth of FACE_PARTS.mouth) for (const [fx, fz] of [[0, 1], [1, 0], [0, -1]]) {
      const p = Object.assign({ x: 0, z: 0, vx: fx, vz: fz, phase: 1, t: 0, h: 1.76, lug: 0, lugCol: '#000000', dog: 0, phone: false, fast: false, rival: false, tele: false, hit: false, isMe: false, fx, fz, circles: [],
        body, build: 'medium', shirtType: 'tee', pantsType: 'jeans', shoeType: 'sneakers', shirt: '#ffcf1f', pants: '#1e3a5f', shoe: '#f4f6f8', skin: '#c68863', hair: '#3b2a1e', hairStyle: 'short', hat: 'none', showHead: '1', pack: 'none', gear: '#111827',
        eyes: eyes[0], nose: nose[0], mouth: mouth[0] });
      applyBuild(p); dress(p); drawPerson(p); n++;
    }
    return n;
  }
};
