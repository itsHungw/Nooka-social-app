import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BALLOON_BOB,
  BALLOON_CELL,
  BALLOON_CLEAR,
  BALLOON_GRID_W,
  BALLOON_HAND,
  BALLOON_HAND_GRIP,
  BALLOON_HAND_SIT,
  BALLOON_HEAD_ROW,
  BALLOON_LEAN,
  BALLOON_PALETTE,
  BALLOON_SWAY,
  balloonGridH,
  balloonHeight,
  balloonHold,
  balloonRows,
  balloonSprite,
  balloonTail,
  balloonWidth,
} from './balloon.ts';
import { LADDER_PALETTE } from './ladder.ts';
import { MASCOT_FRAMES } from './mascot-frames.ts';
import { MASCOT_H, MASCOT_PALETTE, MASCOT_W } from './mascot.ts';

const TAILS = [4, 8, 12, 16, 20];

test('lưới bóng đúng bề ngang ở mọi độ dài dây', () => {
  for (const tail of TAILS) {
    const rows = balloonRows(tail);
    assert.equal(rows.length, balloonGridH(tail), `dây ${tail} ô sai số hàng`);
    for (const row of rows) assert.equal(row.length, BALLOON_GRID_W, `dây ${tail} ô có hàng sai độ dài`);
  }
});

test('bóng không dùng ký tự lạ', () => {
  for (const tail of TAILS) {
    for (const row of balloonRows(tail)) {
      for (const ch of row) {
        if (ch === '.') continue;
        assert.ok(BALLOON_PALETTE[ch], `ký tự "${ch}" không có trong bảng màu bóng`);
      }
    }
  }
});

test('thân bóng tròn: hàng giữa rộng nhất, hàng đầu và cuối thân hẹp hơn', () => {
  const rows = balloonRows(8);
  const solid = (row: string) => row.split('').filter((c) => c !== '.').length;
  const middle = solid(rows[6]);
  assert.equal(middle, BALLOON_GRID_W, 'hàng giữa phải chạm hai mép lưới');
  assert.ok(solid(rows[0]) < middle, 'đỉnh bóng phẳng bằng hàng giữa thì đó là cái hộp');
  assert.ok(solid(rows[12]) < middle, 'đáy bóng phẳng bằng hàng giữa thì đó là cái hộp');
});

test('có đốm sáng và có mảng bóng đổ — thân không phải một mảng phẳng', () => {
  const body = balloonRows(8).slice(0, 13).join('');
  assert.ok(body.includes('h'), 'thiếu đốm sáng thì quả bóng đọc ra là cái đĩa');
  assert.ok(body.includes('R'), 'thiếu bóng đổ thì không ra khối cầu');
});

test('ký tự của bóng không đụng bảng của linh vật và của thang', () => {
  // Ba lưới cùng đi qua một công cụ xem với một bảng màu chung, nên trùng ký tự
  // là quả bóng hiện ra màu nhôm mà nhìn code không thấy vì sao.
  const shared = ['o', 'h']; // viền và đốm sáng — cùng nghĩa ở cả ba
  for (const ch of Object.keys(BALLOON_PALETTE)) {
    if (shared.includes(ch)) continue;
    assert.ok(!MASCOT_PALETTE[ch], `"${ch}" đã là màu của linh vật`);
    assert.ok(!LADDER_PALETTE[ch], `"${ch}" đã là màu của thang`);
  }
});

test('dây dài đúng số ô đã yêu cầu và nối liền từ nút thắt xuống', () => {
  for (const tail of TAILS) {
    const rows = balloonRows(tail);
    const stringRows = rows.filter((row) => row.includes('y'));
    assert.equal(stringRows.length, tail, `xin dây ${tail} ô mà lưới ra ${stringRows.length}`);
    // Không hàng nào của dây được rỗng — dây đứt quãng đọc ra thành đường chấm.
    const first = rows.findIndex((row) => row.includes('y'));
    for (let y = first; y < first + tail; y += 1) {
      assert.ok(rows[y].includes('y'), `hàng ${y} của dây bị thủng`);
    }
  }
});

test('dây lượn chứ không thẳng đơ', () => {
  const rows = balloonRows(16).filter((row) => row.includes('y'));
  const xs = new Set(rows.map((row) => row.indexOf('y')));
  assert.ok(xs.size > 1, 'dây thẳng một cột ở cỡ 2pt đọc ra thành cái que');
});

test('bóng gộp dải thành ít hình, không vẽ từng ô', () => {
  for (const tail of TAILS) {
    const sprite = balloonSprite(tail);
    const rects = sprite.paths.reduce((n, p) => n + p.d.split('M').length - 1, 0);
    const cells = balloonRows(tail).join('').split('').filter((c) => c !== '.').length;
    assert.ok(rects < cells / 2, `dây ${tail}: ${rects} hình cho ${cells} ô — gộp không ăn`);
    assert.ok(sprite.paths.length <= Object.keys(BALLOON_PALETTE).length, 'nhiều path hơn số màu');
  }
});

test('balloonSprite trả về đúng một đối tượng cho mỗi độ dài dây', () => {
  assert.equal(balloonSprite(12), balloonSprite(12), 'dựng lại lưới mỗi lần vẽ là phí');
  assert.notEqual(balloonSprite(12), balloonSprite(13));
});

test('ô pixel của bóng là ô vuông', () => {
  for (const tail of TAILS) {
    const cellW = balloonWidth() / BALLOON_GRID_W;
    const cellH = balloonHeight(tail) / balloonGridH(tail);
    assert.ok(Math.abs(cellW - cellH) < 1e-9, `dây ${tail}: ô ${cellW}×${cellH}, không còn là pixel`);
    assert.ok(Math.abs(cellW - BALLOON_CELL) < 1e-9);
  }
});

const MASCOT_HEIGHT = 64; // MASCOT_SIZE 46 quy ra chiều cao ở app/ask.tsx
const MASCOT_WIDTH = 46;
const LEAN_COS = Math.cos((BALLOON_LEAN * Math.PI) / 180);

test('đáy dây rơi đúng vào bàn tay Nooka, không phải vào giữa người', () => {
  // Đây là cái lỗi đã cắn một lần: neo tính thiếu 3 hàng headroom nên đáy dây
  // rơi vào bụng, dây chui sau thân và quả bóng trông như cắm vào người.
  const anchors = [
    { hand: BALLOON_HAND, frames: ['FLOAT_A', 'FLOAT_B'] as const },
    // Bám khung là đổi tư thế, bàn tay dời chỗ — neo phải dời theo.
    { hand: BALLOON_HAND_GRIP, frames: ['GRIP', 'GRIP_B'] as const },
    // Ngồi ngủ là đổi lần nữa: hai tay buông xuống chống đất.
    { hand: BALLOON_HAND_SIT, frames: ['NAP', 'NAP_B'] as const },
  ];
  for (const { hand, frames } of anchors) {
    for (const id of frames) {
      const cell = MASCOT_FRAMES[id][hand.row][hand.col];
      assert.equal(cell, 'p', `${id}: ô neo dây là "${cell}", không phải đệm bàn tay`);
    }
  }
});

test('chỗ neo lúc bám khung thấp hơn và dạt ra so với lúc bay', () => {
  const flying = balloonHold(MASCOT_WIDTH, MASCOT_HEIGHT);
  const holding = balloonHold(MASCOT_WIDTH, MASCOT_HEIGHT, BALLOON_HAND_GRIP);
  assert.ok(holding.y < flying.y, 'bám khung thì tay hạ xuống, chỗ neo phải thấp hơn');
  assert.ok(holding.x > flying.x, 'bám khung thì tay dạt ra ngoài');
  assert.ok(
    Math.hypot(holding.x - flying.x, holding.y - flying.y) < MASCOT_HEIGHT / 4,
    'hai chỗ neo cách nhau xa quá thì cú nhảy kéo theo một cú giật của quả bóng',
  );
});

test('bóng cầm ở tay trái — nửa trái của lưới linh vật', () => {
  assert.ok(
    BALLOON_HAND.col < MASCOT_W / 2,
    'cột neo nằm ở nửa phải thì đó là tay bên kia',
  );
});

test('dây đủ dài để thân bóng vượt hẳn đỉnh đầu, tính cả phần ngả', () => {
  const tail = balloonTail(MASCOT_HEIGHT);
  const hold = balloonHold(MASCOT_WIDTH, MASCOT_HEIGHT);
  // Quãng dọc dây thật sự leo được — dây ngả nên ngắn hơn chiều dài của nó.
  const knot = hold.y + tail * BALLOON_CELL * LEAN_COS;
  const headTop = MASCOT_HEIGHT * (1 - BALLOON_HEAD_ROW / MASCOT_H);
  assert.ok(
    knot >= headTop,
    `nút thắt ở ${knot.toFixed(1)}pt mà chóp tai đã ở ${headTop.toFixed(1)}pt — bóng đè lên đầu`,
  );
  assert.ok(knot - headTop < BALLOON_CLEAR * 2, 'thả cao quá thì dây dài lê thê');
});

test('bỏ phần ngả ra là dây hụt — vế chia cho cos không thừa', () => {
  const climb = (MASCOT_HEIGHT * (BALLOON_HAND.row - BALLOON_HEAD_ROW)) / MASCOT_H + BALLOON_CLEAR;
  const naive = Math.round(climb / BALLOON_CELL);
  assert.ok(
    balloonTail(MASCOT_HEIGHT) > naive,
    'dây ngả mà tính như dây thẳng thì nó với không tới đỉnh đầu',
  );
});

test('bóng ngả về phía bàn tay cầm, và ngả vừa phải', () => {
  assert.ok(BALLOON_LEAN < 0, 'tay cầm ở bên trái thì bóng phải ngả sang trái');
  assert.ok(Math.abs(BALLOON_LEAN) > BALLOON_SWAY, 'ngả ít hơn biên độ đưa thì có nhịp bóng lật sang phải');
  assert.ok(Math.abs(BALLOON_LEAN) < 45, 'ngả quá nửa vuông thì quả bóng nằm ngang, không phải đang bay lên');
});

test('thân bóng dạt hẳn ra khỏi thân Nooka nhờ ngả', () => {
  const tail = balloonTail(MASCOT_HEIGHT);
  const hold = balloonHold(MASCOT_WIDTH, MASCOT_HEIGHT);
  const axis = (tail + BALLOON_GRID_W / 2) * BALLOON_CELL;
  const bodyX = hold.x + axis * Math.sin((BALLOON_LEAN * Math.PI) / 180);
  assert.ok(bodyX < 0, `tâm bóng ở ${bodyX.toFixed(1)}pt — vẫn nằm trong bề ngang Nooka`);
});

test('bóng bồng bềnh nhẹ và chậm', () => {
  assert.ok(BALLOON_BOB.travel > 0 && BALLOON_BOB.travel < 10, 'nảy mạnh trông như bị giật dây');
  assert.ok(BALLOON_BOB.ms > 1000, 'bồng bềnh nhanh thì đó là quả bóng cao su');
});
