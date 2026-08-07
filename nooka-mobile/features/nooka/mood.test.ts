import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MASCOT_FRAMES } from './mascot-frames.ts';
import { MASCOT_PALETTE } from './mascot.ts';
import {
  MOOD_ANIMATION,
  MOOD_STEPS,
  isDrowsy,
  moodFor,
  type NookaMood,
  type NookaPerch,
} from './mood.ts';

const PERCHES: NookaPerch[] = ['ground', 'frame'];

test('các mốc buồn ngủ xếp tăng dần', () => {
  for (let i = 1; i < MOOD_STEPS.length; i += 1) {
    assert.ok(
      MOOD_STEPS[i].after > MOOD_STEPS[i - 1].after,
      `mốc ${MOOD_STEPS[i].mood} không muộn hơn mốc trước — sẽ có mức không bao giờ tới`,
    );
  }
});

test('vừa gõ xong thì tỉnh, để yên lâu thì ngủ', () => {
  assert.equal(moodFor(0), 'awake');
  assert.equal(moodFor(MOOD_STEPS[0].after - 1), 'awake', 'chưa tới mốc mà đã lim dim');
  assert.equal(moodFor(MOOD_STEPS[0].after), 'doze');
  assert.equal(moodFor(MOOD_STEPS[1].after), 'sleep');
  assert.equal(moodFor(60 * 60 * 1000), 'sleep', 'để cả tiếng vẫn phải là ngủ, không quay lại tỉnh');
});

test('tâm trạng chỉ đi một chiều theo thời gian để yên', () => {
  const order: NookaMood[] = ['awake', 'doze', 'sleep'];
  let seen = -1;
  for (let ms = 0; ms <= MOOD_STEPS[MOOD_STEPS.length - 1].after + 5000; ms += 500) {
    const rank = order.indexOf(moodFor(ms));
    assert.ok(rank >= seen, `ở ${ms}ms tâm trạng lùi về ${moodFor(ms)}`);
    seen = rank;
  }
});

test('chỉ lim dim và ngủ mới phải đổi khung hình', () => {
  assert.equal(isDrowsy('awake'), false, 'tỉnh mà cũng đổi khung thì Nooka thôi vẫy tay');
  assert.equal(isDrowsy('doze'), true);
  assert.equal(isDrowsy('sleep'), true);
});

test('mỗi mốc buồn ngủ có khung hình ở cả hai chỗ nghỉ', () => {
  for (const perch of PERCHES) {
    for (const step of MOOD_STEPS) {
      const anim = MOOD_ANIMATION[perch][step.mood];
      assert.ok(anim, `${perch}/${step.mood} không có hoạt cảnh`);
      assert.equal(anim.frames.length, 2, 'thiếu khung thứ hai thì nhân vật đứng đơ, không phải ngủ');
      for (const id of anim.frames) assert.ok(MASCOT_FRAMES[id], `trỏ tới ${id} không tồn tại`);
    }
  }
});

test('càng buồn ngủ nhịp càng chậm', () => {
  for (const perch of PERCHES) {
    assert.ok(
      MOOD_ANIMATION[perch].sleep.ms > MOOD_ANIMATION[perch].doze.ms,
      `${perch}: ngủ mà thở nhanh bằng lúc lim dim thì không đọc ra là đang ngủ`,
    );
  }
});

test('lim dim thì hai chỗ nghỉ vẽ khác nhau — còn đang bám thì tay phải ở trên mép', () => {
  assert.notDeepEqual(
    MOOD_ANIMATION.ground.doze.frames,
    MOOD_ANIMATION.frame.doze.frames,
    'bám mép mà vẽ như đang đứng dưới đất thì hai tay buông khỏi khung',
  );
});

test('ngủ là ngồi, ở đâu cũng vậy — hai chỗ dùng chung một bộ khung', () => {
  // Không ai ngủ trong lúc treo người bằng hai bàn tay. Tới mức này Nooka đu
  // lên ngồi hẳn lên mép, nên tư thế giống hệt lúc ngồi dưới đất; phần nhấc
  // người là việc của màn hình (`SIT_LIFT` ở `app/ask.tsx`).
  assert.deepEqual(MOOD_ANIMATION.ground.sleep.frames, MOOD_ANIMATION.frame.sleep.frames);
});

test('khung ngủ là tư thế ngồi — chân đế bè hẳn ra so với lúc đứng', () => {
  const width = (rows: readonly string[], y: number) =>
    rows[y].split('').filter((c) => c !== '.').length;
  const standing = MASCOT_FRAMES.RESTING;
  const sitting = MASCOT_FRAMES[MOOD_ANIMATION.ground.sleep.frames[0]];
  // Ba hàng cuối là chỗ chạm đất. Ngồi thì trọng lượng dồn xuống nên nó phải
  // rộng hơn hẳn — bằng nhau thì đó chỉ là đứng khép chân.
  for (let y = sitting.length - 3; y < sitting.length; y += 1) {
    assert.ok(
      width(sitting, y) > width(standing, y),
      `hàng ${y}: ngồi rộng ${width(sitting, y)} ô mà đứng đã ${width(standing, y)} ô`,
    );
  }
});

test('biểu cảm chỉ đổi ở đôi mắt — thân giữ nguyên tư thế đang có', () => {
  // Hàng 36 trở xuống là thân, tay và chân. Đổi ở đó nghĩa là đã vẽ lại cả
  // nhân vật chứ không phải chỉ đổi biểu cảm, và tư thế bám mép sẽ vỡ.
  const bases = { ground: 'RESTING', frame: 'GRIP' } as const;
  for (const perch of PERCHES) {
    const base = MASCOT_FRAMES[bases[perch]];
    const doze = MASCOT_FRAMES[MOOD_ANIMATION[perch].doze.frames[0]];
    for (let y = 36; y < base.length; y += 1) {
      assert.equal(doze[y], base[y], `${perch}: hàng ${y} thuộc thân mà lim dim lại đổi`);
    }
  }
});

test('ngủ thì mắt phải nhắm — không còn khối mắt mở', () => {
  const eyeRow = 22; // hàng ngang qua giữa mắt
  for (const perch of PERCHES) {
    const awake = MASCOT_FRAMES[perch === 'ground' ? 'RESTING' : 'GRIP'][eyeRow];
    const asleep = MASCOT_FRAMES[MOOD_ANIMATION[perch].sleep.frames[0]][eyeRow];
    const count = (row: string) => row.split('').filter((c) => c === 'd').length;
    assert.ok(
      count(asleep) < count(awake),
      `${perch}: mắt lúc ngủ rộng bằng lúc thức thì nó chỉ đang nhìn chằm chằm`,
    );
  }
});

test('hai tay liền với thân ở mọi tư thế nghỉ — không có ô hở kẹp giữa', () => {
  // Lỗi đã cắn hai lần: cánh tay đặt kề sát thân thì mấy hàng bo góc hở ra đúng
  // một ô trong suốt, và cánh tay đọc thành một khối rời lơ lửng cạnh người.
  //
  // Chỉ soi từ hàng 36 xuống — từ vai trở xuống. Bên trên là ăng-ten và hai
  // tai, ở đó ô hở giữa hai mảng đặc là đúng chứ không phải lỗi.
  const BODY_ROW = 36;
  // Khe một ô giữa cổ áo và áo choàng là **cố ý** — xem ghi chú trong `cape` ở
  // `scripts/build-mascot-sprite.js`: hai mảng vàng dính vào nhau thì cả khúc
  // dưới đọc thành một khối liền.
  const accent = (cell: string) => cell === 'g' || cell === 'G';

  const resting = ['RESTING', 'RESTING_B', ...MOOD_ANIMATION.ground.doze.frames, ...MOOD_ANIMATION.ground.sleep.frames] as const;
  for (const id of resting) {
    const rows = MASCOT_FRAMES[id];
    for (let y = BODY_ROW; y < rows.length; y += 1) {
      for (let x = 1; x < rows[y].length - 1; x += 1) {
        const [before, cell, after] = [rows[y][x - 1], rows[y][x], rows[y][x + 1]];
        if (cell !== '.' || before === '.' || after === '.') continue;
        if (accent(before) || accent(after)) continue;
        assert.fail(`${id}: hàng ${y} cột ${x} hở một ô giữa hai mảng đặc`);
      }
    }
  }
});

test('khung ngủ có dấu Zzz, và dấu đó nhúc nhích giữa hai khung', () => {
  for (const perch of PERCHES) {
    const [a, b] = MOOD_ANIMATION[perch].sleep.frames.map((id) => MASCOT_FRAMES[id]);
    // Chữ Z nằm ngoài cột 27 — bên phải vòm đầu và chụp tai.
    const mark = (rows: readonly string[]) =>
      rows.map((row) => row.slice(27)).join('').split('').filter((c) => c !== '.').length;
    assert.ok(mark(a) > 0, `${perch}: khung ngủ không có dấu Zzz nào`);
    assert.notEqual(
      a.map((row) => row.slice(27)).join(''),
      b.map((row) => row.slice(27)).join(''),
      `${perch}: hai khung ngủ có dấu Zzz y hệt nhau thì nó đứng chết một chỗ`,
    );
  }
});

test('khung buồn ngủ không dùng ký tự lạ', () => {
  for (const perch of PERCHES) {
    for (const step of MOOD_STEPS) {
      for (const id of MOOD_ANIMATION[perch][step.mood].frames) {
        for (const row of MASCOT_FRAMES[id]) {
          for (const ch of row) {
            if (ch === '.') continue;
            assert.ok(MASCOT_PALETTE[ch], `${id} dùng ký tự "${ch}" không có trong bảng màu`);
          }
        }
      }
    }
  }
});
