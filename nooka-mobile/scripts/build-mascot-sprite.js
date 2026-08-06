// Dựng sprite Nooka từ primitive rồi sinh ra `features/nooka/mascot-frames.ts`.
//
// Lưới 34 × 44, tỉ lệ chibi: đầu chiếm khoảng nửa chiều cao, thân nhỏ, chân là
// hai mẩu ngắn.
//
//   node scripts/build-mascot-sprite.js              -> ghi đè file frames
//   node scripts/build-mascot-sprite.js out.json     -> xuất JSON để xem thử
//
// Xem lại bằng mắt trước khi commit:
//   node scripts/build-mascot-sprite.js /tmp/f.json && node scripts/preview-mascot-sprite.js /tmp/f.json /tmp/f.png
const fs = require('node:fs');

const W = 34, H = 44, HEADROOM = 3;

const canvas = () => Array.from({ length: H }, () => Array(W).fill('.'));
const put = (g, x, y, ch) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = ch; };
const hline = (g, x0, x1, y, ch) => { for (let x = x0; x <= x1; x++) put(g, x, y, ch); };
const vline = (g, x, y0, y1, ch) => { for (let y = y0; y <= y1; y++) put(g, x, y, ch); };
const rect = (g, x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) hline(g, x0, x1, y, ch); };

/** Khối bo góc bán kính r, viền `outline` ruột `fill`. */
function blob(g, x0, y0, x1, y1, fill, outline, r = 2) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!inRounded(x, y, x0, y0, x1, y1, r)) continue;
      const edge =
        !inRounded(x - 1, y, x0, y0, x1, y1, r) || !inRounded(x + 1, y, x0, y0, x1, y1, r) ||
        !inRounded(x, y - 1, x0, y0, x1, y1, r) || !inRounded(x, y + 1, x0, y0, x1, y1, r);
      put(g, x, y, edge ? outline : fill);
    }
  }
}

/** Hình tròn đặc, bán kính nhận số lẻ. */
function disc(g, cx, cy, r, ch) {
  const span = Math.ceil(r);
  for (let y = cy - span; y <= cy + span; y++)
    for (let x = cx - span; x <= cx + span; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(g, x, y, ch);
}

function inRounded(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x;
  const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.3;
}

/** Đầu: khối **bo góc mềm**, không phải hình tròn — bám theo ảnh mẫu. */
const HEAD_BOX = { x0: 5, y0: 13, x1: 28, y1: 32, r: 7 };
const inHead = (x, y) =>
  inRounded(x, y, HEAD_BOX.x0, HEAD_BOX.y0, HEAD_BOX.x1, HEAD_BOX.y1, HEAD_BOX.r);

function bubble(g) {
  blob(g, 12, 0, 24, 5, 'V', 'V', 2);
  rect(g, 15, 2, 16, 3, 'h');
  rect(g, 18, 2, 19, 3, 'h');
  rect(g, 21, 2, 22, 3, 'h');
  // cuống ăng-ten nối xuống đỉnh đầu
  rect(g, 17, 6, 18, 14, 'g');
  vline(g, 17, 6, 14, 'G');
}

/**
 * Tai mèo — **cao và hẹp**, tách bạch hẳn hai bên, lòng tai bạc hà.
 *
 * Cắt đáy theo `inHead` từng ô: vòm đầu là đường cong nên mỗi cột chạm vỏ ở độ
 * cao khác nhau, cắt phẳng thì hai bên tai thừa ra mẩu viền lơ lửng.
 */
function ear(g, tipX, patch) {
  const TOP = 7;
  for (let i = 0; i < 10; i++) {
    const y = TOP + i;
    // Hệ số nở: tai phải **hẹp hơn** để đầu vẫn là khối lớn nhất. Để 0,32 thì
    // hai tai trải rộng hơn cả bề ngang đầu và lấn át cả nhân vật.
    const half = Math.ceil(i * 0.34);
    const x0 = tipX - half;
    const x1 = tipX + half;
    if (inHead(x0, y) && inHead(x1, y)) break;
    hline(g, x0, x1, y, 'c');
    if (!inHead(x0 - 1, y)) put(g, x0 - 1, y, 'o');
    if (!inHead(x1 + 1, y)) put(g, x1 + 1, y, 'o');
    if (i >= 3) hline(g, x0 + 1, x1 - 1, y, 'q');
    // mảng vàng ở rìa ngoài tai phải
    if (patch && i >= 2) put(g, x1, y, 'G');
  }
  put(g, tipX, TOP - 1, 'o');
}

const ears = (g) => {
  ear(g, 11, false);
  ear(g, 23, true);
};

/** Chụp tai hai bên, áp sát đầu, đối xứng. */
function earPods(g) {
  for (const x of [3, 26]) {
    blob(g, x, 21, x + 5, 28, 'c', 'o', 2);
    blob(g, x + 1, 23, x + 4, 26, 'q', 'o', 1);
  }
}

function head(g) {
  blob(g, HEAD_BOX.x0, HEAD_BOX.y0, HEAD_BOX.x1, HEAD_BOX.y1, 'c', 'o', HEAD_BOX.r);
  // Kính che mặt thụt vào 4 ô mỗi bên: phải còn thấy vành vỏ kem quanh nó,
  // nếu không cả cái đầu thành một mảng nhạt không có hình.
  blob(g, 10, 18, 23, 29, 'v', 'v', 5);
  // đốm bạc hà rải trên trán
  rect(g, 12, 16, 13, 16, 'q');
  rect(g, 20, 16, 21, 16, 'q');
  put(g, 16, 15, 'q');
  eyes(g);
  rect(g, 8, 26, 10, 27, 'b');
  rect(g, 23, 26, 25, 27, 'b');
}

/**
 * Mắt: khối đen lớn, **đốm sáng vuông khoét ở góc trên trái**.
 *
 * Đây là chi tiết làm nên thần thái trong ảnh mẫu — bỏ đốm sáng đi thì mắt
 * thành hai lỗ đen vô hồn.
 */
function eyes(g) {
  for (const x of [11, 18]) {
    rect(g, x, 19, x + 4, 25, 'd');
    rect(g, x, 19, x + 1, 20, 'h');
  }
}

/** Miệng. Giữ nguyên ba biểu cảm đã chốt. */
function mouth(g, kind) {
  if (kind === 'open') {
    blob(g, 15, 27, 19, 30, 'm', 'm', 1);
    return;
  }
  if (kind === 'think') {
    // Nét ngắn và phẳng — đang bận nghĩ, không phải đang cười.
    hline(g, 16, 18, 28, 'm');
    return;
  }
  blob(g, 15, 27, 19, 30, 'm', 'm', 1);
  hline(g, 16, 18, 30, 'v');
}

function torso(g) {
  // cổ áo vàng — dải mỏng ở cổ, không phải mảng lớn
  blob(g, 12, 31, 22, 33, 'g', 'G', 1);
  // thân
  blob(g, 12, 33, 22, 40, 'c', 'o', 3);
  // ống kính bụng: vành vàng, ruột teal. Nhỏ lại để còn thấy vỏ kem quanh nó —
  // to quá thì bụng, cổ áo và áo choàng gộp thành một mảng vàng.
  disc(g, 17, 36, 3.2, 'o');
  disc(g, 17, 36, 2.6, 'g');
  disc(g, 17, 36, 1.6, 't');
  put(g, 16, 35, 'h');
}

/**
 * Áo choàng vàng, buông từ vai phải xuống dưới rồi loe ra.
 *
 * **Nhân vật không có đuôi.** Bản trước tôi vẽ một khối tròn vàng ở đây và nó
 * đọc ra thành đuôi — sai. Đây là áo choàng, và nó phải **nằm sau** thân với
 * tay, nên hàm này gọi trước `torso`.
 */
function cape(g) {
  // Bắt đầu từ cột 24, chừa hẳn một cột viền ngăn với cổ áo. Sát hơn thì hai
  // mảng vàng dính vào nhau và cả khúc dưới đọc thành một khối liền.
  const shape = [
    [32, 24, 26],
    [33, 24, 27],
    [34, 25, 28],
    [35, 25, 29],
    [36, 26, 29],
    [37, 26, 30],
    [38, 27, 30],
    [39, 27, 29],
    [40, 28, 29],
  ];
  for (const [y, x0, x1] of shape) {
    hline(g, x0, x1, y, 'G');
    put(g, x0 - 1, y, 'o');
    put(g, x1 + 1, y, 'o');
  }
  hline(g, 24, 26, 31, 'o');
  hline(g, 28, 29, 41, 'o');
  // ánh sao trên vạt áo, như trong ảnh gốc
  put(g, 28, 35, 'h'); put(g, 29, 36, 'h'); put(g, 28, 37, 'h');
}

/** Chân ngắn, bàn chân vàng. */
function legs(g, tuck) {
  const top = tuck ? 40 : 41;
  blob(g, 13, top, 17, 43, 'c', 'o', 1);
  blob(g, 18, top, 22, 43, 'c', 'o', 1);
  hline(g, 14, 16, 43, 'g');
  hline(g, 19, 21, 43, 'g');
}

/** Chi dày 4 ô từ vai tới cổ tay. */
function limb(g, sx, sy, hx, hy) {
  const steps = Math.max(Math.abs(hx - sx), Math.abs(hy - sy)) || 1;
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(sx + ((hx - sx) * i) / steps);
    const y = Math.round(sy + ((hy - sy) * i) / steps);
    put(g, x - 1, y, 'o'); put(g, x, y, 'c'); put(g, x + 1, y, 'c'); put(g, x + 2, y, 'o');
  }
}

/** Bàn chân mèo có đệm bạc hà. */
function paw(g, x, y) {
  blob(g, x, y, x + 4, y + 4, 'c', 'o', 2);
  rect(g, x + 1, y + 2, x + 3, y + 3, 'p');
}

/** Tay lúc đứng yên: mẩu ngắn sát thân, đúng như ảnh mẫu. */
function armStubs(g) {
  blob(g, 8, 33, 11, 38, 'c', 'o', 2);
  blob(g, 23, 33, 26, 38, 'c', 'o', 2);
  put(g, 9, 36, 'p');
  put(g, 24, 36, 'p');
}

/** Dấu hỏi nét dày 2 ô — nét 1 ô ở cỡ này gần như biến mất. */
function qmark(g, x, y) {
  rect(g, x, y, x + 3, y + 1, 'q');
  rect(g, x + 3, y + 2, x + 4, y + 3, 'q');
  rect(g, x + 2, y + 4, x + 3, y + 5, 'q');
  rect(g, x + 2, y + 7, x + 3, y + 8, 'q');
}

const questions = (g) => {
  qmark(g, 29, 12);
  qmark(g, 28, 23);
  put(g, 2, 18, 'g'); put(g, 1, 19, 'g'); put(g, 2, 20, 'g');
};

const sparks = (g) => {
  put(g, 1, 20, 'g'); hline(g, 0, 2, 21, 'g'); put(g, 1, 22, 'g');
  put(g, 32, 23, 'g'); hline(g, 31, 33, 24, 'g'); put(g, 32, 25, 'g');
  put(g, 31, 32, 'g'); put(g, 2, 34, 'g');
  put(g, 33, 29, 'g'); put(g, 0, 27, 'g');
};

/** Chừa headroom rồi dịch cả khung — nhảy thì đầu phải đi cùng thân. */
function liftFrame(rows, dy) {
  const blank = '.'.repeat(W);
  const padded = [...Array(HEADROOM).fill(blank), ...rows];
  if (!dy) return padded;
  return padded.map((_, y) => padded[y - dy] ?? blank);
}

/** Hàng đầu tiên của bàn chân trong khung đã chèn headroom. */
const LEG_ROW = 41 + HEADROOM;

/**
 * Nhịp thở: hạ **thân trên** xuống một hàng, giữ nguyên chân.
 *
 * Không dùng transform dịch cả người: trôi lên xuống thì bàn chân rời mặt đất,
 * trông như đang bay chứ không phải đang thở.
 */
function dipUpper(rows) {
  const blank = '.'.repeat(W);
  return rows.map((row, y) => (y >= LEG_ROW ? row : rows[y - 1] ?? blank));
}

function build({ pose, dy = 0, lift = 0, mark = null, mouthKind = 'open' }) {
  const g = canvas();
  bubble(g);
  earPods(g);
  head(g);
  ears(g); // sau `head` — xem ghi chú trong `ear`
  mouth(g, mouthKind);
  cape(g); // trước `torso`: áo choàng nằm sau thân và tay
  torso(g);
  legs(g, pose === 'up');

  if (pose === 'down') armStubs(g);
  // Cẳng tay lúc giơ chỉ dài 3–4 hàng. Dài hơn là tay vượt quá tỉ lệ thân —
  // thân chibi vốn đã lùn, tay dài làm nhân vật trông như bị kéo dãn.
  if (pose === 'wave') {
    limb(g, 11, 34, 9, 31 - lift); paw(g, 6, 28 - lift);
    blob(g, 22, 33, 25, 38, 'c', 'o', 2); put(g, 23, 36, 'p');
  }
  if (pose === 'up') {
    limb(g, 11, 34, 8, 30); paw(g, 5, 27);
    limb(g, 22, 34, 25, 30); paw(g, 24, 27);
  }
  if (pose === 'grip') {
    // Hai bàn tay vắt lên mép thanh nhập, ngay dưới hai bên đầu. Phần thân dưới
    // sẽ bị chính thanh nhập che nên không cần vẽ gì thêm ở dưới.
    paw(g, 8, 32);
    paw(g, 21, 32);
  }
  if (pose === 'think') {
    // Tay phải buông; tay trái gập lên chống cằm, bàn tay dừng ngay dưới miệng.
    blob(g, 22, 33, 25, 38, 'c', 'o', 2); put(g, 23, 36, 'p');
    limb(g, 13, 35, 13, 32);
    paw(g, 12, 28);
  }

  const rows = liftFrame(g.map((r) => r.join('')), dy);
  if (!mark) return rows;
  const marked = rows.map((r) => r.split(''));
  if (mark === 'question') questions(marked);
  if (mark === 'spark') sparks(marked);
  return marked.map((r) => r.join(''));
}

const RESTING_BASE = build({ pose: 'down', mouthKind: 'closed' });
const GRIP_BASE = build({ pose: 'grip', mouthKind: 'closed' });

const frames = {
  // Nấp sau thanh nhập, hai tay bám mép.
  GRIP: GRIP_BASE,
  GRIP_B: dipUpper(GRIP_BASE),
  // Hai khung thở: chân đứng im, thân trên nhún một hàng.
  RESTING: RESTING_BASE,
  RESTING_B: dipUpper(RESTING_BASE),
  IDLE_A: build({ pose: 'wave', lift: 0 }),
  IDLE_B: build({ pose: 'wave', lift: 2 }),
  THINK_A: build({ pose: 'think', mark: 'question', mouthKind: 'think' }),
  THINK_B: build({ pose: 'think', dy: -1, mark: 'question', mouthKind: 'think' }),
  YAY_A: build({ pose: 'up', dy: -1, mark: 'spark' }),
  YAY_B: build({ pose: 'up', dy: -3, mark: 'spark' }),
};

const target = process.argv[2];

if (target && target.endsWith('.json')) {
  fs.writeFileSync(target, JSON.stringify(frames, null, 0));
} else {
  const header = [
    '/**',
    ` * Khung hình pixel của linh vật Nooka — ${W} × ${H + HEADROOM} ô.`,
    ' *',
    ' * **File này sinh ra tự động — đừng sửa tay.** Sửa hình thì sửa',
    ' * `scripts/build-mascot-sprite.js` rồi chạy lại:',
    ' *',
    ' *     node scripts/build-mascot-sprite.js',
    ' *',
    ' * Gõ tay từng ký tự thì lệch một cột là hỏng cả hình mà nhìn code không thấy.',
    ' *',
    ' * Mỗi ký tự là một ô màu, tra ở `MASCOT_PALETTE` trong `mascot.ts`. Dấu chấm',
    ' * là ô trong suốt.',
    ' */',
    'export const MASCOT_FRAMES = {',
  ].join('\n');

  const body = Object.entries(frames)
    .map(([name, rows]) => `  ${name}: [\n${rows.map((r) => `    ${JSON.stringify(r)}`).join(',\n')},\n  ],`)
    .join('\n');

  fs.writeFileSync(`${__dirname}/../features/nooka/mascot-frames.ts`, `${header}\n${body}\n} as const;\n`);
}

for (const [k, v] of Object.entries(frames)) {
  console.log(k.padEnd(9), `${v.length} hàng ×`, `${v[0].length} cột`);
}
