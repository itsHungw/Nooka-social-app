import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ascentLength } from './ascent.ts';
import {
  LADDER_CELL,
  LADDER_GRID_W,
  LADDER_PALETTE,
  LADDER_RUNGS,
  RUNG_RISE,
  ladderGridH,
  ladderHeight,
  ladderRows,
  ladderRungs,
  ladderSprite,
  ladderWidth,
} from './ladder.ts';
import { MASCOT_W } from './mascot.ts';

const RUNG_RANGE = Array.from(
  { length: LADDER_RUNGS.max - LADDER_RUNGS.min + 1 },
  (_, i) => LADDER_RUNGS.min + i,
);

test('lưới thang đúng bề ngang ở mọi số bậc', () => {
  for (const rungs of RUNG_RANGE) {
    const rows = ladderRows(rungs);
    assert.equal(rows.length, ladderGridH(rungs), `${rungs} bậc sai số hàng`);
    for (const row of rows) assert.equal(row.length, LADDER_GRID_W, `${rungs} bậc có hàng sai độ dài`);
  }
});

test('thang không dùng ký tự lạ', () => {
  for (const rungs of RUNG_RANGE) {
    for (const row of ladderRows(rungs)) {
      for (const ch of row) {
        if (ch === '.') continue;
        assert.ok(LADDER_PALETTE[ch], `ký tự "${ch}" không có trong bảng màu thang`);
      }
    }
  }
});

test('hai thanh dọc chạy suốt chiều dài, không đứt hàng nào', () => {
  const rows = ladderRows(5);
  for (const [y, row] of rows.entries()) {
    assert.notEqual(row[0], '.', `hàng ${y} thủng thanh trái`);
    assert.notEqual(row[LADDER_GRID_W - 1], '.', `hàng ${y} thủng thanh phải`);
  }
});

test('đếm được đúng số bậc trong lưới', () => {
  for (const rungs of RUNG_RANGE) {
    // Bậc là hàng có màu nhôm ở giữa hai thanh; mỗi bậc dày hai hàng.
    const bars = ladderRows(rungs).filter((row) => row.slice(3, LADDER_GRID_W - 3).includes('a'));
    assert.equal(bars.length, rungs, `${rungs} bậc mà lưới đếm ra ${bars.length}`);
  }
});

test('hai đầu thang cân nhau — không đầu nào hở rộng hơn khoảng giữa các bậc', () => {
  const rows = ladderRows(5);
  const rungRows = rows.flatMap((row, y) => (row.slice(3, LADDER_GRID_W - 3).includes('a') ? [y] : []));
  const head = rungRows[0];
  const foot = rows.length - 1 - (rungRows[rungRows.length - 1] + 1);
  assert.equal(head, foot, `đầu thang hở ${head} hàng mà chân thang hở ${foot}`);
});

test('chân thang và đầu thang đều có mũ đỏ', () => {
  const rows = ladderRows(4);
  assert.ok(rows[0].includes('f'), 'đầu thang không có mũ');
  assert.ok(rows[rows.length - 1].includes('f'), 'chân thang không có đế');
});

test('thang gộp dải thành ít hình, không vẽ từng ô', () => {
  for (const rungs of RUNG_RANGE) {
    const sprite = ladderSprite(rungs);
    const rects = sprite.paths.reduce((n, p) => n + p.d.split('M').length - 1, 0);
    const cells = ladderRows(rungs).join('').split('').filter((c) => c !== '.').length;
    assert.ok(rects < cells / 2, `${rungs} bậc: ${rects} hình cho ${cells} ô — gộp không ăn`);
    assert.ok(sprite.paths.length <= Object.keys(LADDER_PALETTE).length, 'nhiều path hơn số màu');
  }
});

test('ladderSprite trả về đúng một đối tượng cho mỗi số bậc', () => {
  assert.equal(ladderSprite(5), ladderSprite(5), 'dựng lại lưới mỗi lần vẽ là phí');
  assert.notEqual(ladderSprite(5), ladderSprite(6));
});

test('ô pixel của thang là ô vuông', () => {
  for (const rungs of RUNG_RANGE) {
    const cellW = ladderWidth() / LADDER_GRID_W;
    const cellH = ladderHeight(rungs) / ladderGridH(rungs);
    assert.ok(Math.abs(cellW - cellH) < 1e-9, `${rungs} bậc: ô ${cellW}×${cellH}, không còn là pixel`);
    assert.ok(Math.abs(cellW - LADDER_CELL) < 1e-9);
  }
});

test('thang luôn dài hơn quãng nó phải bắc qua, và không thừa quá một bậc', () => {
  // Thang dựa nghiêng nên phải so với **cạnh huyền**, không phải quãng dọc.
  for (const [run, rise] of [[37, 40], [37, 62], [37, 80], [37, 106], [12, 30]]) {
    const length = ascentLength(run, rise);
    const rungs = ladderRungs(length);
    if (length > ladderHeight(LADDER_RUNGS.max) || rungs === LADDER_RUNGS.min) continue;
    assert.ok(
      ladderHeight(rungs) >= length,
      `bắc qua ${length.toFixed(1)}pt mà thang chỉ dài ${ladderHeight(rungs).toFixed(1)}pt`,
    );
    assert.ok(
      ladderHeight(rungs) - length < RUNG_RISE,
      `bắc qua ${length.toFixed(1)}pt mà thang dài tới ${ladderHeight(rungs).toFixed(1)}pt — thừa cả bậc`,
    );
  }
});

test('ladderRungs nghịch đảo đúng ladderHeight', () => {
  for (const rungs of RUNG_RANGE) {
    assert.equal(ladderRungs(ladderHeight(rungs)), rungs, `${rungs} bậc quay vòng không về chính nó`);
  }
});

test('ô nhập kịch trần vẫn nằm trong tầm chiếc thang dài nhất', () => {
  // `maxHeight: 120` của ô nhập, gót cần lên 106pt, quãng ngang 35pt.
  const length = ascentLength(35, 106);
  assert.ok(
    ladderHeight(LADDER_RUNGS.max) >= length,
    `cần thang dài ${length.toFixed(1)}pt mà dài nhất chỉ có ${ladderHeight(LADDER_RUNGS.max).toFixed(1)}pt`,
  );
});

test('thang hẹp hơn Nooka để còn thấy nhân vật, nhưng rộng hơn thân để tay bám được', () => {
  const mascotPt = 46; // MASCOT_SIZE ở app/ask.tsx
  const bodyPt = (24 / MASCOT_W) * mascotPt; // vòm đầu chiếm 24 ô của lưới 34
  assert.ok(ladderWidth() < mascotPt, 'thang rộng hơn Nooka thì che mất nhân vật');
  assert.ok(ladderWidth() > bodyPt, 'thang hẹp hơn thân thì hai tay bám vào hư không');
});

test('số bậc không bao giờ rơi ra ngoài khoảng đã khai', () => {
  for (const length of [0, 20, 48, 62, 80, 106, 400]) {
    const rungs = ladderRungs(length);
    assert.ok(rungs >= LADDER_RUNGS.min && rungs <= LADDER_RUNGS.max, `${rungs} ngoài khoảng`);
  }
});

test('một bậc cao đúng năm ô lưới', () => {
  assert.equal(RUNG_RISE, 5 * LADDER_CELL);
});
