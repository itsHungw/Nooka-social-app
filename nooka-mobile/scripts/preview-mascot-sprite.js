// Render các frame pixel ra một file PNG để nhìn bằng mắt trước khi đưa vào app.
const zlib = require('node:zlib');
const fs = require('node:fs');

const P = {
  '.': null,
  o: '#9c8863', w: '#fffdf7', c: '#f7f0e0', s: '#e7dcc4',
  v: '#e6f3ec', V: '#c3e2d5', g: '#f5c043', G: '#e8b02c',
  d: '#2b2620', h: '#ffffff', b: '#f7c9b0', m: '#e2604f',
  t: '#2e8b86', p: '#a9dfd0', q: '#7fc9bb',
};

const frames = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const SCALE = 8, PAD = 10, GAP = 14;
const names = Object.keys(frames);
const cellW = Math.max(...names.map((n) => Math.max(...frames[n].map((r) => r.length))));
const cellH = Math.max(...names.map((n) => frames[n].length));
const W = PAD + names.length * (cellW * SCALE + GAP);
const H = PAD * 2 + cellH * SCALE;

const buf = Buffer.alloc(W * H * 4);
// nền kem
for (let i = 0; i < W * H; i++) {
  buf[i * 4] = 0xfb; buf[i * 4 + 1] = 0xf9; buf[i * 4 + 2] = 0xf4; buf[i * 4 + 3] = 0xff;
}

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

names.forEach((name, idx) => {
  const ox = PAD + idx * (cellW * SCALE + GAP);
  const oy = PAD;
  frames[name].forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = P[row[x]];
      if (!col) continue;
      const [r, g, b] = hex(col);
      for (let dy = 0; dy < SCALE; dy++) {
        for (let dx = 0; dx < SCALE; dx++) {
          const px = ox + x * SCALE + dx, py = oy + y * SCALE + dy;
          if (px < 0 || px >= W || py < 0 || py >= H) continue;
          const o = (py * W + px) * 4;
          buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = 255;
        }
      }
    }
  });
});

// ── PNG ──────────────────────────────────────────────
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (b) => {
  let c = -1;
  for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const raw = Buffer.alloc(H * (W * 4 + 1));
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0;
  buf.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
}

fs.writeFileSync(process.argv[3], Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]));
console.log('wrote', process.argv[3], W + 'x' + H);
