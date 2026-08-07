// Xem hai đạo cụ của Nooka bằng mắt trước khi tin vào chúng.
//
//   node scripts/preview-props.ts            -> in lưới ra terminal
//   node scripts/preview-props.ts out.json   -> xuất JSON cho preview-mascot-sprite.js
//
// Ra PNG:
//   node scripts/preview-props.ts /tmp/p.json && node scripts/preview-mascot-sprite.js /tmp/p.json /tmp/p.png
//
// Khác linh vật, đạo cụ **không có file khung hình sinh sẵn**: lưới dựng lúc
// chạy theo chiều cao ô nhập. Script này chỉ là kính lúp, không sinh ra gì để
// commit.
import { writeFileSync } from 'node:fs';

import { ascentLength } from '../features/nooka/ascent.ts';
import { BALLOON_CELL, balloonRows, balloonTail, balloonWidth } from '../features/nooka/balloon.ts';
import { LADDER_RUNGS, ladderHeight, ladderRows, ladderRungs, ladderWidth } from '../features/nooka/ladder.ts';

const MASCOT_HEIGHT = 64; // MASCOT_SIZE 46 quy ra chiều cao ở app/ask.tsx
const ASCENT_RUN = 37; // quãng ngang từ tâm Nooka tới mép ô nhập

const rungCounts = Array.from(
  { length: LADDER_RUNGS.max - LADDER_RUNGS.min + 1 },
  (_, i) => LADDER_RUNGS.min + i,
);

const frames: Record<string, string[]> = {};
for (const rungs of rungCounts) frames[`RUNG_${rungs}`] = ladderRows(rungs);
frames.BALLOON = balloonRows(balloonTail(MASCOT_HEIGHT));

const target = process.argv[2];

if (target) {
  // `preview-mascot-sprite.js` xếp các khung cạnh nhau nên mọi khung phải cùng
  // số hàng — đệm hàng trong suốt lên đầu khung ngắn.
  const tallest = Math.max(...Object.values(frames).map((rows) => rows.length));
  const widest = Math.max(...Object.values(frames).map((rows) => rows[0].length));
  const padded = Object.fromEntries(
    Object.entries(frames).map(([name, rows]) => [
      name,
      [
        ...Array(tallest - rows.length).fill('.'.repeat(widest)),
        ...rows.map((row) => row.padEnd(widest, '.')),
      ],
    ]),
  );
  writeFileSync(target, JSON.stringify(padded));
  console.log('wrote', target);
} else {
  for (const [name, rows] of Object.entries(frames)) {
    console.log(`=== ${name}`);
    for (const row of rows) console.log(row.replace(/\./g, ' '));
  }
}

// Chiếc thang nào cho ô nhập nào: chiều cao đo được ở `app/ask.tsx` là 44 khi
// một dòng, rồi mỗi dòng thêm chừng 18pt.
for (const fieldH of [76, 94, 112, 120]) {
  const rise = fieldH - MASCOT_HEIGHT * (10 / 47);
  const length = ascentLength(ASCENT_RUN, rise);
  const rungs = ladderRungs(length);
  console.log(
    `ô nhập ${fieldH}pt`.padEnd(16),
    `bắc qua ${length.toFixed(1)}pt →`,
    `${rungs} bậc, thang dài ${ladderHeight(rungs).toFixed(1)}pt`,
  );
}

const tail = balloonTail(MASCOT_HEIGHT);
console.log(
  'bóng'.padEnd(16),
  `${balloonWidth().toFixed(1)}pt ngang, dây ${(tail * BALLOON_CELL).toFixed(1)}pt`,
  `— thang rộng ${ladderWidth().toFixed(1)}pt`,
);
