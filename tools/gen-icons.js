/* Vygeneruje icon-192.png a icon-512.png bez externych kniznic (node zlib).
   Spustenie:  node tools/gen-icons.js                                        */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const OUT = path.join(__dirname, '..');

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function png(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;      // bit depth
  ihdr[9] = 6;      // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ikona: fialove pozadie + bily kruh (ako kcal kruh v appke) s medzerou */
function draw(size) {
  const S = 3;                      // supersampling kvoli hladkym hranam
  const W = size, H = size;
  const buf = Buffer.alloc(W * H * 4);
  const cx = size / 2, cy = size / 2;
  const rOut = size * 0.335, rIn = size * 0.245;
  const dotR = size * 0.045;
  const dotA = -Math.PI / 2;        // zacatok kruhu je hore
  const dotX = cx + Math.cos(dotA) * (rOut + rIn) / 2;
  const dotY = cy + Math.sin(dotA) * (rOut + rIn) / 2;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let cover = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = x + (sx + 0.5) / S, py = y + (sy + 0.5) / S;
          const dx = px - cx, dy = py - cy;
          const r = Math.sqrt(dx * dx + dy * dy);
          let inRing = false;
          if (r >= rIn && r <= rOut) {
            // uhol od hornej hrany po smere hodinovych ruciciek, 0..2PI
            let ang = Math.atan2(dy, dx) - dotA;
            while (ang < 0) ang += Math.PI * 2;
            while (ang > Math.PI * 2) ang -= Math.PI * 2;
            inRing = ang <= Math.PI * 1.58;       // ~78 % kruhu, zbytok je medzera
          }
          const ddx = px - dotX, ddy = py - dotY;
          const inDot = Math.sqrt(ddx * ddx + ddy * ddy) <= dotR;
          if (inRing || inDot) cover++;
        }
      }
      cover /= S * S;
      // pozadie: vertikalny prechod #7c5cff -> #5a3be0
      const t = y / (H - 1);
      const br = Math.round(0x7c + (0x5a - 0x7c) * t);
      const bg = Math.round(0x5c + (0x3b - 0x5c) * t);
      const bb = Math.round(0xff + (0xe0 - 0xff) * t);
      const i = (y * W + x) * 4;
      buf[i] = Math.round(br * (1 - cover) + 255 * cover);
      buf[i + 1] = Math.round(bg * (1 - cover) + 255 * cover);
      buf[i + 2] = Math.round(bb * (1 - cover) + 255 * cover);
      buf[i + 3] = 255;
    }
  }
  return png(W, H, buf);
}

[192, 512].forEach(function (s) {
  const file = path.join(OUT, 'icon-' + s + '.png');
  fs.writeFileSync(file, draw(s));
  console.log('zapisane', file, fs.statSync(file).size, 'B');
});
