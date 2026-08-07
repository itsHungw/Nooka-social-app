import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MASCOT_FRAMES } from './mascot-frames.ts';
import {
  HIDE_DWELL,
  HOME_DWELL,
  HOME_STAGE,
  MASCOT_ANIMATION,
  MASCOT_H,
  MASCOT_MOVE,
  MASCOT_PALETTE,
  MASCOT_PATHS,
  MASCOT_W,
  PEEK_ANIMATION,
  PEEK_DWELL,
  PEEK_POSES,
  isWaiting,
  nextPeekPose,
  nextStage,
  peekDwell,
  stageDwell,
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

test('tư thế nấp không bao giờ bốc trúng chính nó', () => {
  for (const current of PEEK_POSES) {
    for (const roll of [0, 0.25, 0.5, 0.75, 0.999999]) {
      const next = nextPeekPose(current, roll);
      assert.notEqual(next, current, `từ ${current} lại bốc ra ${current}`);
      assert.ok(PEEK_POSES.includes(next), `bốc ra tư thế lạ: ${next}`);
    }
  }
});

test('nextPeekPose phủ hết các tư thế còn lại', () => {
  const seen = new Set([nextPeekPose('hidden', 0), nextPeekPose('hidden', 0.99)]);
  assert.deepEqual([...seen].sort(), ['grip', 'wave']);
});

test('thời gian giữ một tư thế nằm trong khoảng đã khai', () => {
  for (const roll of [0, 0.5, 1]) {
    const ms = peekDwell(roll);
    assert.ok(ms >= PEEK_DWELL.min && ms <= PEEK_DWELL.max, `${ms} ngoài khoảng`);
  }
  assert.ok(PEEK_DWELL.max - PEEK_DWELL.min > 2000, 'khoảng quá hẹp thì nhịp đoán được ngay');
});

test('trạng thái có việc để kể thì không tính là chờ', () => {
  for (const [state, anim] of Object.entries(MASCOT_ANIMATION)) {
    if (!anim.loops && state !== 'searching') continue;
    assert.equal(
      isWaiting(state as keyof typeof MASCOT_ANIMATION),
      false,
      `${state} mà tính là chờ thì Nooka được phép đi trốn giữa lúc đang kể chuyện`,
    );
  }
  assert.ok(isWaiting('idle') && isWaiting('resting'));
});

test('ở nhà thì không bao giờ là tư thế chìm', () => {
  assert.equal(HOME_STAGE.spot, 'beside');
  assert.notEqual(HOME_STAGE.pose, 'hidden', 'ở bên trái ô nhập mà chìm là biến mất giữa thanh');
});

test('từ nhà chỉ chui vào sau ô nhập rồi bám mép — không chìm thẳng', () => {
  for (const roll of [0, 0.25, 0.5, 0.75, 0.999999]) {
    assert.deepEqual(nextStage(HOME_STAGE, roll), { spot: 'behind', pose: 'grip' });
  }
});

test('đang chìm thì phải trồi lên tại chỗ nấp, không nhảy thẳng về nhà', () => {
  for (const roll of [0, 0.25, 0.5, 0.75, 0.999999]) {
    const next = nextStage({ spot: 'behind', pose: 'hidden' }, roll);
    assert.equal(next.spot, 'behind', 'về nhà từ dưới đáy là hiện ra ở bên trái từ hư không');
    assert.notEqual(next.pose, 'hidden');
  }
});

test('đang thò lên thì hoặc về nhà, hoặc đổi sang tư thế nấp khác', () => {
  for (const pose of ['grip', 'wave'] as const) {
    assert.deepEqual(nextStage({ spot: 'behind', pose }, 0), HOME_STAGE);
    const stay = nextStage({ spot: 'behind', pose }, 0.999999);
    assert.equal(stay.spot, 'behind');
    assert.notEqual(stay.pose, pose, `từ ${pose} lại bốc ra ${pose}`);
  }
});

test('mỗi lượt nấp luôn ngắn hơn một lượt đứng nhà', () => {
  assert.ok(
    HOME_DWELL.min > PEEK_DWELL.max,
    'nấp lâu bằng đứng nhà thì sau ô nhập mới là chỗ ở, không phải bên trái',
  );
  assert.ok(HOME_DWELL.max - HOME_DWELL.min > 2000, 'khoảng quá hẹp thì nhịp đoán được ngay');
});

test('thời gian giữ một chặng lấy đúng khoảng của chỗ đang đứng', () => {
  for (const roll of [0, 0.5, 1]) {
    const home = stageDwell(HOME_STAGE, roll);
    assert.ok(home >= HOME_DWELL.min && home <= HOME_DWELL.max, `${home} ngoài khoảng ở nhà`);
    const peek = stageDwell({ spot: 'behind', pose: 'grip' }, roll);
    assert.ok(peek >= PEEK_DWELL.min && peek <= PEEK_DWELL.max, `${peek} ngoài khoảng nấp`);
    const hide = stageDwell({ spot: 'behind', pose: 'hidden' }, roll);
    assert.ok(hide >= HIDE_DWELL.min && hide <= HIDE_DWELL.max, `${hide} ngoài khoảng chìm`);
  }
});

test('đi tới nơi rồi mới đổi tư thế — ba đoạn di chuyển không chồng lên nhịp nấp', () => {
  assert.ok(
    MASCOT_MOVE.walk + MASCOT_MOVE.lift < PEEK_DWELL.min,
    'chưa tới sau ô nhập mà đã bốc tư thế mới thì cú chìm rơi ra giữa đường',
  );
  assert.ok(
    MASCOT_MOVE.dip < PEEK_DWELL.min,
    'chưa trồi lên xong đã sang chặng sau thì Nooka đi về trong lúc còn dưới đáy',
  );
});

test('mọi tư thế nấp trỏ tới khung hình có thật', () => {
  for (const [pose, anim] of Object.entries(PEEK_ANIMATION)) {
    for (const id of anim.frames) assert.ok(MASCOT_FRAMES[id], `${pose} trỏ tới ${id} không tồn tại`);
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
