import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ASCENT_ANIMATION,
  ASCENT_MEANS,
  ASCENT_MOVE,
  ASCENT_PHASES,
  ASCENT_SLACK,
  DUCK_DWELL,
  GROUND_DWELL,
  HOP_REACH,
  PERCH_DWELL,
  PERCH_POSE_DWELL,
  PAW_RATIO,
  ascentAct,
  ascentInPlace,
  ascentLean,
  ascentLength,
  ascentOnStage,
  ascentPhaseMs,
  ascentPins,
  ascentResting,
  climbStop,
  gripRise,
  needsAscent,
  duckDwell,
  nextAscentPhase,
  nextRimSpot,
  offGround,
  onFrame,
  perchPoseDwell,
  perchSink,
  pickMeans,
  restingDwell,
  type AscentMeans,
  type AscentPhase,
} from './ascent.ts';
import { MASCOT_FRAMES } from './mascot-frames.ts';
import { MASCOT_ANIMATION, MASCOT_H, MASCOT_MOVE } from './mascot.ts';
import { MOOD_STEPS } from './mood.ts';

const MASCOT_HEIGHT = 64; // MASCOT_SIZE 46 quy ra chiều cao ở app/ask.tsx
const PEEK = 30; // BEHIND_OFFSET.y

/** Người dùng để yên bao lâu thì Nooka ngủ hẳn và thôi đổi ý. */
function sleepAfter(): number {
  const step = MOOD_STEPS.find((item) => item.mood === 'sleep');
  if (!step) throw new Error('MOOD_STEPS không còn mức `sleep` — màn kịch leo hết đối thủ để đua');
  return step.after;
}

/** Trọn một chuyến đi lên / đi xuống, tính bằng ms. */
const climbTrip = (means: AscentMeans, rungs: number) =>
  ASCENT_MOVE.lead +
  ascentPhaseMs('arriving', means, rungs) +
  ascentPhaseMs('ready', means, rungs) +
  ascentPhaseMs('climbing', means, rungs) +
  ascentPhaseMs('hopping', means, rungs);

const descendTrip = (means: AscentMeans, rungs: number) =>
  ascentPhaseMs('hopping', means, rungs) +
  ascentPhaseMs('descending', means, rungs) +
  ascentPhaseMs('ready', means, rungs) +
  ascentPhaseMs('leaving', means, rungs);

test('mỗi chặng đi tiếp được cả hai chiều và không rơi ra ngoài bảng', () => {
  for (const phase of ASCENT_PHASES) {
    for (const wants of [true, false]) {
      assert.ok(ASCENT_PHASES.includes(nextAscentPhase(phase, wants)), `${phase}/${wants} ra chặng lạ`);
    }
  }
});

test('away và gripping là hai đầu — tới nơi rồi thì đứng yên', () => {
  assert.equal(nextAscentPhase('gripping', true), 'gripping');
  assert.equal(nextAscentPhase('away', false), 'away');
});

test('không có lối tắt: lấy đạo cụ, đặt vào, trèo, rồi mới nhảy bám khung', () => {
  let phase: AscentPhase = 'away';
  const seen: AscentPhase[] = [phase];
  for (let i = 0; i < 12 && phase !== 'gripping'; i += 1) {
    phase = nextAscentPhase(phase, true);
    seen.push(phase);
  }
  assert.deepEqual(seen, ['away', 'arriving', 'ready', 'climbing', 'hopping', 'gripping']);
});

test('đường xuống đi ngược đúng đường lên', () => {
  let phase: AscentPhase = 'gripping';
  const seen: AscentPhase[] = [phase];
  for (let i = 0; i < 12 && phase !== 'away'; i += 1) {
    phase = nextAscentPhase(phase, false);
    seen.push(phase);
  }
  assert.deepEqual(seen, ['gripping', 'hopping', 'descending', 'ready', 'leaving', 'away']);
});

test('buông khung là phải nhảy về đạo cụ trước, không thả rơi thẳng xuống đất', () => {
  assert.equal(nextAscentPhase('gripping', false), 'hopping');
  assert.equal(nextAscentPhase('hopping', false), 'descending');
});

test('đạo cụ không bao giờ rút đi khi Nooka còn rời mặt đất', () => {
  for (const phase of ASCENT_PHASES) {
    if (!offGround(phase)) continue;
    for (const wants of [true, false]) {
      const next = nextAscentPhase(phase, wants);
      assert.ok(
        ascentInPlace(next),
        `từ ${phase} sang ${next}: Nooka còn lơ lửng mà đạo cụ đã rời chỗ`,
      );
    }
  }
});

test('Nooka không rời mặt đất trước khi đạo cụ vào đúng chỗ', () => {
  for (const phase of ASCENT_PHASES) {
    if (ascentInPlace(phase)) continue;
    for (const wants of [true, false]) {
      assert.equal(
        offGround(nextAscentPhase(phase, wants)),
        false,
        `từ ${phase} mà đã bay lên trong lúc đạo cụ chưa tới nơi`,
      );
    }
  }
});

test('cú nhảy đi được cả hai chiều — đổi ý giữa lúc đang nhảy thì quay đầu', () => {
  assert.equal(nextAscentPhase('hopping', true), 'gripping');
  assert.equal(nextAscentPhase('hopping', false), 'descending');
});

test('đổi ý giữa chừng thì quay đầu tại chỗ, không nhảy cóc', () => {
  assert.equal(nextAscentPhase('descending', true), 'climbing', 'đang tụt mà gõ thêm thì trèo lại');
  assert.equal(nextAscentPhase('leaving', true), 'arriving', 'đang cất đạo cụ mà cần lại thì lấy vào');
  assert.equal(nextAscentPhase('arriving', false), 'leaving');
  assert.equal(nextAscentPhase('climbing', false), 'descending');
});

test('chỉ có đúng một chặng Nooka bám vào khung', () => {
  const gripping = ASCENT_PHASES.filter(onFrame);
  assert.deepEqual(gripping, ['gripping']);
  assert.ok(offGround('gripping'), 'bám khung mà vẫn tính là đứng dưới đất');
});

test('chờ Nooka về tới chỗ ở rồi mới gọi đạo cụ tới', () => {
  // Đường về xa nhất là từ dưới đáy ô nhập: trồi lên, hạ khỏi mép, rồi đi ngang
  // về. Lấy mỗi `walk` thì đạo cụ tới nơi trong lúc nhân vật còn đang lùi ra.
  assert.ok(
    ASCENT_MOVE.lead >= MASCOT_MOVE.dip + MASCOT_MOVE.lift + MASCOT_MOVE.walk,
    'đạo cụ tới trước thì Nooka đón nó trong lúc còn đang đi ở chỗ khác',
  );
});

test('đạo cụ còn trên màn hình thì màn kịch giữ chỗ đứng, bất kể còn cớ hay không', () => {
  // Đây là luật chống cộng dồn hai phép dịch: hệ đi lại quanh ô nhập và màn kịch
  // leo cùng dịch một lớp phủ, nên chỉ một hệ được cầm lái tại một thời điểm.
  for (const phase of ASCENT_PHASES) {
    if (!ascentOnStage(phase)) continue;
    for (const wanted of [true, false]) {
      assert.equal(
        ascentPins(phase, wanted),
        true,
        `${phase}/${wanted}: đạo cụ còn đó mà Nooka được phép đi trốn — nó trượt ngang ra khỏi thang`,
      );
    }
  }
});

test('mới có cớ là đã ghim, không đợi đạo cụ ra tới nơi', () => {
  // Nooka cần trọn `ASCENT_MOVE.lead` để đi về chỗ ở trước khi đạo cụ tới. Ghim
  // muộn hơn thì nó đi trốn đúng trong quãng đó.
  assert.equal(ascentPins('away', true), true);
});

test('chỉ đúng một hoàn cảnh là Nooka được tự do đi lại', () => {
  const free = ASCENT_PHASES.filter((phase) => !ascentPins(phase, false));
  assert.deepEqual(free, ['away'], 'hết đạo cụ và hết cớ thì mới tới lượt hệ đi lại');
});

test('quãng nhô lên khi chưa có đạo cụ phủ đúng tới ngưỡng gọi đạo cụ', () => {
  // `PEEK_REACH` ở `app/ask.tsx` là `BEHIND_OFFSET.y + ASCENT_SLACK`. Hai bên
  // phải nối liền: mọi chiều cao chưa cần đạo cụ đều nằm trong tầm với, nếu
  // không thì có một quãng ô nhập mà tư thế `grip` bám vào khoảng không dưới mép
  // và cũng chẳng có thang nào được gọi ra bù.
  const reach = PEEK + ASCENT_SLACK;
  for (const fieldH of [44, 52, 58, 62, 76, 120]) {
    const rise = gripRise(fieldH, MASCOT_HEIGHT);
    if (needsAscent(rise, PEEK)) continue;
    assert.ok(
      Math.min(rise, reach) === rise,
      `ô nhập ${fieldH}pt: chưa gọi đạo cụ mà mép đã ngoài tầm với`,
    );
  }
});

test('chặng nào có diễn thì có thời lượng, hai đầu thì không', () => {
  for (const means of ASCENT_MEANS) {
    for (const phase of ASCENT_PHASES) {
      const ms = ascentPhaseMs(phase, means, 5);
      if (phase === 'away' || phase === 'gripping') {
        assert.equal(ms, 0, `${phase} là chỗ dừng, không được tự hết giờ`);
        continue;
      }
      assert.ok(ms > 0, `${means}/${phase} không có thời lượng thì máy chạy vụt qua`);
    }
  }
});

test('thang càng dài thì trèo càng lâu; quả bóng thì không đổi', () => {
  assert.ok(ascentPhaseMs('climbing', 'ladder', 8) > ascentPhaseMs('climbing', 'ladder', 3));
  assert.equal(
    ascentPhaseMs('climbing', 'balloon', 8),
    ascentPhaseMs('climbing', 'balloon', 3),
    'quả bóng không có bậc nào để đếm',
  );
});

test('một bậc là một nhịp khung hình', () => {
  assert.equal(ASCENT_ANIMATION.climb.ms, ASCENT_MOVE.step);
  assert.equal(ascentPhaseMs('climbing', 'ladder', 5), 5 * ASCENT_ANIMATION.climb.ms);
});

test('cú nhảy ngắn hơn mọi chặng khác — nhảy chậm thì thành trôi', () => {
  for (const means of ASCENT_MEANS) {
    for (const phase of ASCENT_PHASES) {
      if (phase === 'away' || phase === 'gripping' || phase === 'hopping') continue;
      assert.ok(
        ASCENT_MOVE.hop < ascentPhaseMs(phase, means, 3),
        `cú nhảy dài bằng chặng ${means}/${phase}`,
      );
    }
  }
});

test('mọi hoạt cảnh trỏ tới khung hình có thật', () => {
  for (const [act, anim] of Object.entries(ASCENT_ANIMATION)) {
    assert.ok(anim.frames.length > 1, `${act} chỉ có một khung thì không động đậy`);
    for (const id of anim.frames) assert.ok(MASCOT_FRAMES[id], `${act} trỏ tới ${id} không tồn tại`);
  }
});

test('mọi chặng rời mặt đất đều có tư thế, với cả hai phương tiện', () => {
  for (const means of ASCENT_MEANS) {
    for (const phase of ASCENT_PHASES) {
      const act = ascentAct(phase, means);
      if (!offGround(phase)) continue;
      assert.ok(act && ASCENT_ANIMATION[act], `${means}/${phase} lơ lửng mà không có tư thế`);
    }
  }
});

test('chưa có đạo cụ thì không diễn trò gì', () => {
  for (const means of ASCENT_MEANS) assert.equal(ascentAct('away', means), null);
});

test('hai phương tiện diễn khác nhau ở lúc lấy đạo cụ và lúc lên', () => {
  for (const phase of ['arriving', 'climbing', 'descending'] as const) {
    assert.notEqual(
      ascentAct(phase, 'ladder'),
      ascentAct(phase, 'balloon'),
      `${phase}: hai phương tiện mà diễn y hệt thì bốc thăm để làm gì`,
    );
  }
});

test('chỉ trên mép mới vẫy tay được — mọi chặng khác hai tay đều bận', () => {
  // Đang trèo thang hay đang đu dây bóng mà vẫy tay là một nhân vật sắp ngã.
  for (const means of ASCENT_MEANS) {
    for (const phase of ASCENT_PHASES) {
      if (onFrame(phase)) continue;
      assert.equal(
        ascentAct(phase, means, true),
        ascentAct(phase, means, false),
        `${means}/${phase}: buông tay ra vẫy trong lúc còn đang bám đạo cụ`,
      );
    }
  }
});

test('trên mép thì vẫy tay là một tư thế khác hẳn tư thế treo', () => {
  for (const means of ASCENT_MEANS) {
    assert.equal(ascentAct('gripping', means, false), 'grip');
    assert.equal(ascentAct('gripping', means, true), 'greet');
  }
});

test('cú vẫy trên mép dùng lại đúng khung vẫy dưới đất, cùng nhịp', () => {
  // Không dựng khung "vừa bám mép vừa vẫy": lưới không đủ chỗ cạnh cái đầu, và
  // dù có chỗ thì cũng sai — không ai vẫy tay lúc treo bằng hai bàn tay. Nooka
  // đu lên đứng trên mép, nên tư thế đúng là tư thế đứng vẫy sẵn có.
  assert.deepEqual(ASCENT_ANIMATION.greet.frames, MASCOT_ANIMATION.idle.frames);
  assert.equal(ASCENT_ANIMATION.greet.ms, MASCOT_ANIMATION.idle.ms);
});

test('đổi tư thế trên mép nhiều lần trong một lượt treo', () => {
  // Giữ tư thế lâu bằng cả lượt treo thì có những lượt Nooka lên tới nơi, chưa
  // kịp vẫy lần nào đã tới giờ tụt xuống.
  assert.ok(PERCH_POSE_DWELL.max < PERCH_DWELL.min);
  for (const roll of [0, 0.5, 1]) {
    const ms = perchPoseDwell(roll);
    assert.ok(ms >= PERCH_POSE_DWELL.min && ms <= PERCH_POSE_DWELL.max, `${roll}: ${ms} ngoài khoảng`);
  }
});

test('nhảy và bám khung thì hai phương tiện giống nhau — lúc đó đạo cụ hết việc', () => {
  for (const phase of ['hopping', 'gripping'] as const) {
    assert.equal(ascentAct(phase, 'ladder'), ascentAct(phase, 'balloon'));
  }
});

test('bốc thăm phủ hết phương tiện và không ra thứ lạ', () => {
  const seen = new Set<AscentMeans>();
  for (const roll of [0, 0.25, 0.5, 0.75, 0.999999]) {
    const means = pickMeans(roll);
    assert.ok(ASCENT_MEANS.includes(means), `bốc ra phương tiện lạ: ${means}`);
    seen.add(means);
  }
  assert.deepEqual([...seen].sort(), [...ASCENT_MEANS].sort(), 'có phương tiện không bao giờ được bốc');
});

test('bốc thăm không rơi ra ngoài mảng ở biên trên', () => {
  assert.ok(ASCENT_MEANS.includes(pickMeans(1)));
});

test('tỉ lệ tầm tay đọc đúng từ lưới sprite', () => {
  // Hai bàn tay của khung GRIP ở hàng 35–39, tâm hàng 37 của 47.
  assert.ok(Math.abs(PAW_RATIO - (MASCOT_H - 37) / MASCOT_H) < 1e-9, 'tỉ lệ lệch khỏi lưới thật');
});

test('quãng phải lên đặt đúng hai bàn tay lên mép ô nhập', () => {
  for (const fieldH of [44, 76, 120]) {
    const rise = gripRise(fieldH, MASCOT_HEIGHT);
    const pawY = rise + MASCOT_HEIGHT * PAW_RATIO;
    assert.ok(Math.abs(pawY - fieldH) < 1e-9, `ô nhập ${fieldH}pt: tay rơi ở ${pawY}pt`);
  }
});

test('ô nhập cao lên thì phải bò lên theo, và không bao giờ âm', () => {
  assert.ok(gripRise(120, MASCOT_HEIGHT) > gripRise(76, MASCOT_HEIGHT));
  assert.equal(gripRise(0, MASCOT_HEIGHT), 0, 'ô nhập chưa có chiều cao mà đã phải trèo');
});

test('quãng nhô lên sẵn có của Nooka khớp với chỗ bám khi ô nhập thấp nhất', () => {
  // `BEHIND_OFFSET.y` không phải con số bốc ra: đó đúng là chỗ hai bàn tay chạm
  // mép khi ô nhập ở `minHeight`. Lệch nhiều thì lúc chưa cần đạo cụ Nooka đã
  // bám hụt mép rồi.
  assert.ok(Math.abs(gripRise(44, MASCOT_HEIGHT) - PEEK) < 1);
});

test('chỉ gọi đạo cụ khi kiễng chân thật sự không tới', () => {
  assert.equal(needsAscent(PEEK, PEEK), false, 'vừa đủ với tới mà đã lôi thang ra');
  assert.equal(needsAscent(PEEK + ASCENT_SLACK, PEEK), false, 'hụt một chút thì kiễng chân là xong');
  assert.equal(needsAscent(PEEK + ASCENT_SLACK + 1, PEEK), true);
});

test('một dòng và hai dòng thì không cần đạo cụ, ba dòng thì cần', () => {
  // Chiều cao ô nhập đo được ở `app/ask.tsx`: 44 khi một dòng, mỗi dòng thêm
  // chừng 18pt.
  assert.equal(needsAscent(gripRise(44, MASCOT_HEIGHT), PEEK), false, 'một dòng mà đã vác thang');
  assert.equal(needsAscent(gripRise(58, MASCOT_HEIGHT), PEEK), false, 'hai dòng chưa gọi là quá dài');
  assert.equal(needsAscent(gripRise(76, MASCOT_HEIGHT), PEEK), true, 'ba dòng mà Nooka vẫn chìm nghỉm');
});

test('trốn ở mép thì đỉnh đầu hạ xuống khít mép, không hơn không kém', () => {
  // Quãng thả là thứ **suy ra từ hình**, không phải chọn bằng mắt: thả đúng phần
  // thân trên hai bàn tay thì đỉnh đầu rơi đúng vào mép ô nhập, và ô nhập (vẽ
  // sau lớp linh vật) che nốt phần còn lại. Hụt một chút là còn một mẩu đầu nhô
  // lên giữa bức tường chữ.
  for (const fieldH of [76, 96, 120]) {
    const crown = gripRise(fieldH, MASCOT_HEIGHT) - perchSink(MASCOT_HEIGHT) + MASCOT_HEIGHT;
    assert.ok(Math.abs(crown - fieldH) < 1e-9, `ô nhập ${fieldH}pt: đỉnh đầu ở ${crown}pt`);
  }
});

test('quãng thả nằm gọn trong chiều cao của chính Nooka', () => {
  // Thả sâu hơn cả con thì hai bàn tay tụt xuống dưới đáy ô nhập, mà tay vẫn
  // đang bám mép — nhân vật dài ra giữa chừng.
  assert.ok(perchSink(MASCOT_HEIGHT) > 0);
  assert.ok(perchSink(MASCOT_HEIGHT) < MASCOT_HEIGHT);
});

test('lượt trốn ở mép luôn ngắn hơn lượt treo — trốn không được thành chỗ ở', () => {
  // Cùng luật với `PERCH_DWELL`/`GROUND_DWELL` và `HOME_DWELL`/`PEEK_DWELL`:
  // chỗ Nooka có việc phải là chỗ nó ở lâu nhất.
  assert.ok(
    DUCK_DWELL.max < PERCH_DWELL.min,
    'chạm một cái rồi mất hút nhân vật lâu hơn cả lượt nó đứng nhìn',
  );
  for (const roll of [0, 0.5, 1]) {
    const ms = duckDwell(roll);
    assert.ok(ms >= DUCK_DWELL.min && ms <= DUCK_DWELL.max, `${roll}: ${ms} ngoài khoảng`);
  }
});

test('nấp xong là trồi lên chỗ khác, không bao giờ đúng chỗ cũ', () => {
  // Trồi lên đúng chỗ vừa chìm xuống thì cú nấp chỉ là một nhịp nhấp nháy.
  for (const spot of [0, 1] as const) {
    assert.notEqual(nextRimSpot(spot), spot, `chỗ ${spot}: nấp xong lại hiện ra y chỗ cũ`);
  }
  assert.equal(nextRimSpot(nextRimSpot(0)), 0, 'hai lượt nấp phải đưa Nooka về lại chỗ gốc');
});

test('cú dịch dọc mép xong hẳn trước lúc trồi lên — không ai thấy nó đi', () => {
  // Màn hình hoãn cú dịch một nhịp `dip` rồi đi hết `walk`. Lượt nấp ngắn hơn
  // tổng đó thì Nooka trồi lên giữa chừng và người dùng thấy nó lướt ngang trong
  // lúc đang bám mép bằng hai tay.
  //
  // Và phải dôi ra một quãng đứng yên, không chỉ vừa khít: dịch xong là nhô lên
  // ngay thì cả lượt nấp đọc thành một cú trượt liền mạch chứ không phải "chìm
  // xuống, đi, rồi ló ra". Đây là chỗ đầu tiên bị gặm khi có ai thấy Nooka trốn
  // hơi lâu — gặm tới sát sàn là mất luôn cú ú oà.
  const move = MASCOT_MOVE.dip + MASCOT_MOVE.walk;
  assert.ok(DUCK_DWELL.min > move, 'lượt nấp ngắn hơn cú dịch — nhân vật hiện ra giữa đường');
  assert.ok(
    DUCK_DWELL.min - move >= MASCOT_MOVE.lift,
    'dịch xong là ló lên ngay, mắt chưa kịp mất dấu nó',
  );
});

test('rời mép mà đang đứng lệch thì có đủ thì giờ bò về trên đầu đạo cụ', () => {
  // Cùng dạng với `lead`: trồi lên khỏi chỗ nấp rồi bò dọc mép về. Thiếu quãng
  // này thì cú nhảy về phải gánh thêm quãng lệch trong đúng `hop` mili giây.
  assert.ok(ASCENT_MOVE.rimHome >= MASCOT_MOVE.dip + MASCOT_MOVE.walk);
});

test('chỉ hai đầu máy trạng thái mới là chỗ nghỉ', () => {
  // Đồng hồ "chán rồi, đổi chỗ" chỉ được chạy ở đây. Cho nó chạy giữa lúc đang
  // leo thì quãng lấy đạo cụ ăn mất một phần lượt treo, và chiếc thang vừa dựng
  // xong đã phải dọn đi.
  assert.deepEqual(ASCENT_PHASES.filter(ascentResting).sort(), ['away', 'gripping']);
});

test('lượt treo trên khung dài hơn hẳn lượt nghỉ dưới đất', () => {
  assert.ok(
    PERCH_DWELL.min > GROUND_DWELL.max,
    'nghỉ lâu bằng treo thì dưới đất mới là chỗ ở, mà trên khung mới là chỗ nó có việc',
  );
});

test('mỗi lượt bốc một quãng riêng, và quãng đủ rộng để nhịp không đoán được', () => {
  for (const [phase, range] of [['gripping', PERCH_DWELL], ['away', GROUND_DWELL]] as const) {
    for (const roll of [0, 0.5, 1]) {
      const ms = restingDwell(phase, roll);
      assert.ok(ms >= range.min && ms <= range.max, `${phase}/${roll}: ${ms} ngoài khoảng`);
    }
    assert.ok(range.max - range.min > 4000, `${phase}: khoảng quá hẹp thì nhịp đoán được ngay`);
  }
});

test('nghỉ một lượt vẫn dài hơn cả chuyến đi lên', () => {
  // Trọn một lượt lên: chờ về chỗ ở, lấy đạo cụ, đứng vào chỗ, leo, rồi nhảy.
  for (const means of ASCENT_MEANS) {
    const trip = climbTrip(means, 8);
    assert.ok(
      GROUND_DWELL.min > trip,
      `${means}: đi lên mất ${trip}ms mà nghỉ ít nhất chỉ ${GROUND_DWELL.min}ms — Nooka leo lên leo xuống không ngơi`,
    );
  }
});

test('có những lượt Nooka ngủ luôn trên mép — lượt treo vắt qua giờ đi ngủ', () => {
  // Vế thứ nhất của cuộc đua. `max` không vượt qua mốc ngủ thì lượt treo nào
  // cũng kết thúc trước giờ ngủ, và Nooka **luôn** tụt xuống trước khi thiu thiu
  // — mất hẳn cảnh nó ngủ gật ngay trên mép ô nhập.
  assert.ok(
    PERCH_DWELL.max > sleepAfter(),
    `treo lâu nhất ${PERCH_DWELL.max}ms mà ${sleepAfter()}ms đã ngủ — không lượt nào ngủ trên mép`,
  );
});

test('có những lượt Nooka kịp xuống rồi leo lên lại trước khi ngủ', () => {
  // Vế thứ hai. Đây là vế dễ mất nhất: chỉ cần ai đó nâng `PERCH_DWELL.min` lên
  // một chút là trọn vòng xuống–lên không còn lọt trong quãng thức, và người dùng
  // ngồi yên sẽ chẳng bao giờ thấy Nooka tự leo lên lại.
  for (const means of ASCENT_MEANS) {
    const round = PERCH_DWELL.min + descendTrip(means, 8) + GROUND_DWELL.min + climbTrip(means, 8);
    assert.ok(
      round < sleepAfter(),
      `${means}: vòng nhanh nhất mất ${round}ms mà ${sleepAfter()}ms đã ngủ — không lượt nào đi được cả hai chiều`,
    );
  }
});

test('khoá màn kịch bằng mốc lim dim là mất hẳn vòng xuống–lên', () => {
  // Vì sao `app/ask.tsx` truyền `!isAsleep(mood)` chứ không phải `!isDrowsy(mood)`:
  // vòng xuống–lên **nhanh nhất** vẫn dài hơn quãng tới lúc lim dim, nên lấy mốc
  // lim dim là không lượt nào đi trọn được và người dùng ngồi yên sẽ luôn thấy
  // Nooka ngủ tại chỗ đang đứng. Test này giữ đúng cái lý do đó: hôm nào nó bắt
  // đầu fail nghĩa là hai mốc đã đủ xa nhau để `isDrowsy` dùng lại được — lúc ấy
  // đọc lại cả ba luật rồi hãy đổi, đừng xoá test.
  const doze = MOOD_STEPS.find((step) => step.mood === 'doze');
  assert.ok(doze, 'không còn mức lim dim');
  assert.ok(doze.after < sleepAfter(), 'lim dim phải tới trước ngủ hẳn');
  for (const means of ASCENT_MEANS) {
    const round = PERCH_DWELL.min + descendTrip(means, 8) + GROUND_DWELL.min + climbTrip(means, 8);
    assert.ok(round > doze.after, `${means}: vòng nhanh nhất ${round}ms lọt cả trong quãng chưa lim dim`);
  }
});

test('đường đi xiên: thân đạo cụ dài hơn cả quãng ngang lẫn quãng dọc', () => {
  const length = ascentLength(35, 62);
  assert.ok(length > 62 && length > 35);
  assert.equal(ascentLength(0, 62), 62, 'không có quãng ngang thì thân bằng đúng quãng dọc');
});

test('Nooka dừng thấp hơn đầu đạo cụ, nhưng vẫn đi được gần hết', () => {
  for (const rise of [40, 62, 80, 106]) {
    const length = ascentLength(37, rise);
    const stop = climbStop(length);
    assert.ok(stop < 1, `dài ${length.toFixed(1)}pt mà vẫn trèo tới sát đầu thang`);
    assert.ok(stop > 0.7, `dài ${length.toFixed(1)}pt mà mới đi được ${(stop * 100).toFixed(0)}%`);
    assert.ok(
      Math.abs(length * (1 - stop) - HOP_REACH) < 1e-9,
      'quãng chừa lại phải đúng bằng tầm với, không phải một tỉ lệ bốc ra',
    );
  }
});

test('đạo cụ ngắn quá thì đi hết, không lùi xuống dưới chân', () => {
  assert.equal(climbStop(HOP_REACH), 1);
  assert.equal(climbStop(1), 1, 'chừa 14pt trên một đoạn 1pt là trèo ngược xuống đất');
});

test('cú nhảy đi lên chứ không chỉ trượt ngang', () => {
  // Dừng thấp hơn đầu đạo cụ nghĩa là chỗ bám cao hơn chỗ đứng cuối cùng.
  for (const rise of [62, 106]) {
    const stop = climbStop(ascentLength(37, rise));
    assert.ok(rise - rise * stop > 4, 'chênh lệch nhỏ quá thì cú nhảy đọc ra là trôi ngang');
  }
});

test('ô nhập càng cao thì đạo cụ càng dựng đứng', () => {
  assert.ok(
    ascentLean(35, 106) < ascentLean(35, 62),
    'tường càng cao mà thang càng nằm ngang thì nó chống vào không khí',
  );
  assert.equal(ascentLean(0, 50), 0, 'không lệch ngang thì phải thẳng đứng');
  assert.ok(ascentLean(35, 62) > 0, 'nghiêng về phía ô nhập là chiều dương');
});
