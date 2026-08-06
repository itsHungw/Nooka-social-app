import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MASCOT_FRAMES } from './mascot-frames.ts';
import {
  MASCOT_ANIMATION,
  MASCOT_H,
  MASCOT_PALETTE,
  MASCOT_PATHS,
  MASCOT_W,
  spritePaths,
} from './mascot.ts';

test('mọi khung hình đúng kích thước lưới', () => {
  for (const [id, rows] of Object.entries(MASCOT_FRAMES)) {
    assert.equal(rows.length, MASCOT_H, `${id} sai số hàng`);
    for (const row of rows) assert.equal(row.length, MASCOT_W, `${id} có hàng sai độ dài`);
  }
});

test('không khung nào dùng ký tự lạ', () => {
  for (const [id, rows] of Object.entries(MASCOT_FRAMES)) {
    for (const row of rows) {
      for (const ch of row) {
        if (ch === '.') continue;
        assert.ok(MASCOT_PALETTE[ch], `${id} dùng ký tự "${ch}" không có trong bảng màu`);
      }
    }
  }
});

test('spritePaths gộp ô liền nhau thành một hình chữ nhật', () => {
  const paths = spritePaths(['.ooo.', '.....']);
  assert.equal(paths.length, 1);
  assert.equal(paths[0].d, 'M1 0h3v1h-3z');
});

test('spritePaths tách hai dải rời trên cùng hàng', () => {
  const paths = spritePaths(['o.o']);
  assert.equal(paths.length, 1);
  assert.equal(paths[0].d, 'M0 0h1v1h-1zM2 0h1v1h-1z');
});

test('spritePaths chồng dải trùng khít ở hàng kề thành một hình cao', () => {
  const paths = spritePaths(['.oo.', '.oo.', '.oo.']);
  assert.equal(paths.length, 1);
  assert.equal(paths[0].d, 'M1 0h2v3h-2z');
});

test('spritePaths không chồng khi hàng kề lệch cột', () => {
  const paths = spritePaths(['.oo.', '..oo']);
  assert.equal(paths[0].d, 'M1 0h2v1h-2zM2 1h2v1h-2z');
});

test('spritePaths không chồng qua hàng đứt quãng', () => {
  const paths = spritePaths(['.o.', '...', '.o.']);
  assert.equal(paths[0].d, 'M1 0h1v1h-1zM1 2h1v1h-1z');
});

test('spritePaths gom theo màu, mỗi màu một path', () => {
  const paths = spritePaths(['ooddoo']);
  assert.equal(paths.length, 2);
  assert.deepEqual(paths.map((p) => p.token).sort(), ['mascotEye', 'mascotOutline']);
});

test('spritePaths bỏ qua lưới rỗng', () => {
  assert.deepEqual(spritePaths(['...', '...']), []);
});

test('gộp dải giảm số lệnh vẽ so với vẽ từng ô', () => {
  for (const [id, paths] of Object.entries(MASCOT_PATHS)) {
    const rects = paths.reduce((n, p) => n + p.d.split('M').length - 1, 0);
    const cells = MASCOT_FRAMES[id as keyof typeof MASCOT_FRAMES]
      .join('')
      .split('')
      .filter((c) => c !== '.').length;
    assert.ok(rects < cells / 2, `${id}: ${rects} hình cho ${cells} ô — gộp không ăn`);
    assert.ok(paths.length <= 13, `${id} có ${paths.length} path, nhiều hơn số màu`);
  }
});

test('mọi trạng thái trỏ tới khung hình có thật', () => {
  for (const [state, anim] of Object.entries(MASCOT_ANIMATION)) {
    assert.ok(anim.frames.length > 0, `${state} không có khung nào`);
    for (const id of anim.frames) assert.ok(MASCOT_FRAMES[id], `${state} trỏ tới ${id} không tồn tại`);
    if (anim.then) assert.ok(MASCOT_ANIMATION[anim.then], `${state} chuyển sang trạng thái lạ`);
  }
});

test('trạng thái found là hữu hạn — không reo mãi', () => {
  const found = MASCOT_ANIMATION.found;
  assert.ok(found.loops && found.loops > 0);
  assert.equal(found.then, 'resting');
});

test('đứng yên vẫn thở, và thở phải chậm hơn mọi hoạt cảnh khác', () => {
  const resting = MASCOT_ANIMATION.resting;
  assert.equal(resting.frames.length, 2, 'thiếu khung thứ hai thì không thở được');
  for (const state of ['idle', 'searching', 'found'] as const) {
    assert.ok(
      MASCOT_ANIMATION[state].ms < resting.ms,
      `${state} phải nhanh hơn nhịp thở, nếu không đứng yên trông như đang bồn chồn`,
    );
  }
});

test('nhịp thở giữ chân đứng im — chỉ thân trên nhún', () => {
  const [a, b] = MASCOT_ANIMATION.resting.frames.map((id) => MASCOT_FRAMES[id]);
  const legRows = a.length - 3; // ba hàng cuối là bàn chân
  for (let y = legRows; y < a.length; y++) {
    assert.equal(a[y], b[y], `hàng ${y} thuộc phần chân mà lại đổi giữa hai khung`);
  }
  const upperChanged = a.slice(0, legRows).some((row, y) => row !== b[y]);
  assert.ok(upperChanged, 'thân trên không đổi thì hai khung y hệt nhau, không thành nhịp thở');
});
