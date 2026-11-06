// Generates icon PNGs with no dependencies: node tools/make-icons.js
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const crc = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return b => { let c = ~0; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; }; })();
const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4); data.copy(b, 8);
  b.writeUInt32BE(crc(b.subarray(4, 8 + data.length)), 8 + data.length); return b; };
function png(size) {
  const NAVY = [15, 27, 45], YEL = [255, 207, 31], S = size / 512, raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) { raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const px = (x + .5) / S, py = (y + .5) / S; let c = NAVY;
      if (Math.hypot(px - 256, py - 256) < 190) c = YEL;
      if (Math.hypot(px - 256, py - 175) < 48) c = NAVY;                       // head
      const dx = Math.abs(px - 256) - 40, dy = Math.abs(py - 330) - 70;        // body (rounded box)
      if (Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) < 34 && Math.min(Math.max(dx, dy), 0) < 0 + 34) c = NAVY;
      raw.set(c, y * (size * 3 + 1) + 1 + x * 3);
    } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const s of [180, 192, 512]) fs.writeFileSync(path.join(__dirname, '..', 'public', 'icons', `icon-${s}.png`), png(s));
