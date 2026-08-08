import { MASCOT_MOVE, PEEK_DWELL, type FrameId } from './mascot.ts';

/**
 * Nooka lên tới mép ô nhập bằng cách nào.
 *
 * **Vì sao cần.** Ô nhập ở `app/ask.tsx` là multiline và cao dần theo số dòng
 * người dùng gõ. Nooka cao đúng `MASCOT_SIZE` và tự nhô lên được đúng
 * `BEHIND_OFFSET.y` — gõ tới dòng thứ ba là mép ô nhập vượt hẳn tầm với và
 * nhân vật chìm nghỉm sau một bức tường chữ.
 *
 * Có **hai** cách lên, bốc thăm mỗi lượt: vác thang tới dựa vào khung ô nhập
 * rồi trèo, hoặc tóm lấy một quả bóng bay rồi để nó nhấc lên. Ngẫu nhiên là chủ
 * ý — cố định một màn kịch thì tới lần thứ ba người dùng thôi không nhìn nữa.
 *
 * Hai cách đi **chung một đường và chung một máy trạng thái**; chỉ khác đạo cụ,
 * tư thế và nhịp. Tách làm hai máy thì đến lúc thêm luật (ví dụ "không rút
 * phương tiện khi Nooka còn ở trên") sẽ có một bản bị bỏ quên.
 *
 * Toàn bộ file là hàm thuần, không import React — chạy được bằng `node --test`.
 */

export type AscentMeans = 'ladder' | 'balloon';

export const ASCENT_MEANS: readonly AscentMeans[] = ['ladder', 'balloon'];

/** Bốc phương tiện cho lượt tới. Chốt một lần lúc rời `away`, không đổi giữa chừng. */
export const pickMeans = (roll = Math.random()): AscentMeans =>
  ASCENT_MEANS[Math.min(ASCENT_MEANS.length - 1, Math.floor(roll * ASCENT_MEANS.length))];

/**
 * Nooka đang ở chặng nào của màn kịch.
 *
 *   away       — chưa có gì, đạo cụ nằm ngoài mép trái màn hình
 *   arriving   — kéo thang vào / với lấy quả bóng đang dạt tới
 *   ready      — thang đã dựa vào khung ô nhập / dây bóng đã nằm trong tay
 *   climbing   — trèo hoặc bay lên dọc đường đi
 *   hopping    — **nhảy bám vào khung ô nhập**, hoặc nhảy ngược về đạo cụ
 *   gripping   — đang treo trên khung, bò dọc mép khi ô nhập cao thêm
 *   descending — trèo hoặc hạ xuống
 *   leaving    — đạo cụ rút khỏi mép trái
 *
 * `hopping` dùng chung cho **cả hai chiều** vì đó đúng là một động tác: buông
 * chỗ này bám chỗ kia. Chiều nào là do ý định lúc đó quyết định, không phải do
 * tên chặng — nhờ vậy người dùng đổi ý giữa cú nhảy thì Nooka quay đầu tại chỗ
 * chứ không kẹt ở một chặng chỉ đi được một hướng.
 */
export type AscentPhase =
  | 'away'
  | 'arriving'
  | 'ready'
  | 'climbing'
  | 'hopping'
  | 'gripping'
  | 'descending'
  | 'leaving';

export const ASCENT_PHASES: readonly AscentPhase[] = [
  'away',
  'arriving',
  'ready',
  'climbing',
  'hopping',
  'gripping',
  'descending',
  'leaving',
];

/** Chặng kế tiếp khi vẫn còn cớ để lên. */
const FORWARD: Record<AscentPhase, AscentPhase> = {
  away: 'arriving',
  arriving: 'ready',
  ready: 'climbing',
  climbing: 'hopping',
  hopping: 'gripping',
  gripping: 'gripping',
  // Đổi ý giữa chừng: đang tụt thì trèo lại, đang cất đạo cụ thì lấy vào lại.
  descending: 'climbing',
  leaving: 'arriving',
};

/** Chặng kế tiếp khi hết cớ — đúng chiều ngược lại, không có lối tắt. */
const BACKWARD: Record<AscentPhase, AscentPhase> = {
  away: 'away',
  arriving: 'leaving',
  ready: 'leaving',
  climbing: 'descending',
  hopping: 'descending',
  gripping: 'hopping',
  descending: 'ready',
  leaving: 'away',
};

/**
 * Một bước của máy trạng thái. `wants` là ý định hiện tại của màn hình: ô nhập
 * còn cao thì còn muốn lên.
 *
 * Hàm thuần và **không có lối tắt**: từ `away` không nhảy thẳng tới `gripping`,
 * và từ `gripping` không về thẳng `away`. Đó là thứ giữ cho đạo cụ không bao
 * giờ biến mất khi Nooka còn treo lơ lửng trên nó.
 */
export const nextAscentPhase = (phase: AscentPhase, wants: boolean): AscentPhase =>
  wants ? FORWARD[phase] : BACKWARD[phase];

/** Đạo cụ có mặt trên màn hình không. */
export const ascentOnStage = (phase: AscentPhase) => phase !== 'away';

/**
 * Màn kịch leo có đang **giữ chỗ đứng của Nooka** không.
 *
 * Chỗ đứng của Nooka do đúng **một** hệ quyết định tại một thời điểm. Hai hệ
 * cùng dịch một lớp phủ: `useMascotStage` đưa nó đi trốn quanh ô nhập, còn màn
 * kịch này đưa nó dọc đạo cụ rồi lên mép. Cộng cả hai vào nhau thì Nooka rời
 * khỏi chiếc thang đúng bằng quãng đi trốn, quả bóng tuột khỏi tay đúng bằng
 * ngần ấy, và lúc bám khung nó vọt lên cao hơn mép đúng một quãng nhô — tới mức
 * ngủ là ngồi trên không.
 *
 * Ghim từ lúc **mới có cớ** (`wanted`), không đợi tới lúc đạo cụ ra: Nooka cần
 * trọn `ASCENT_MOVE.lead` để đi về chỗ ở, mà cho nó đi trốn trong quãng đó thì
 * đạo cụ tới nơi lúc nhân vật đang ở chỗ khác.
 *
 * Một luật viết **một lần**, cho cả hai việc: tắt hệ đi lang thang, và từ chối
 * một cú chạm đòi đi trốn. Hai chỗ đọc hai điều kiện khác nhau thì tới lúc thêm
 * chặng mới sẽ có một chỗ bị bỏ quên.
 */
export const ascentPins = (phase: AscentPhase, wanted: boolean) => wanted || ascentOnStage(phase);

/**
 * Đạo cụ đang ở chỗ của nó, **hoặc đang trên đường tới đó**.
 *
 * Khác `ascentInPlace` ở đúng chặng `arriving`, và khác biệt đó là cả điểm: cú
 * trượt vào từ mép trái phải diễn **trong** lúc `arriving`, không phải sau nó.
 * Lấy `ascentInPlace` để chạy hoạt cảnh vào chỗ thì đạo cụ đứng im suốt chặng
 * arriving rồi mới lết vào trong lúc Nooka đã bắt đầu trèo.
 */
export const ascentSettling = (phase: AscentPhase) => phase !== 'away' && phase !== 'leaving';

/** Đạo cụ đã vào đúng vị trí chưa. `arriving`/`leaving` là lúc nó còn đang đi. */
export const ascentInPlace = (phase: AscentPhase) =>
  phase === 'ready' ||
  phase === 'climbing' ||
  phase === 'hopping' ||
  phase === 'gripping' ||
  phase === 'descending';

/** Nooka có rời mặt đất không. */
export const offGround = (phase: AscentPhase) =>
  phase === 'climbing' || phase === 'hopping' || phase === 'gripping' || phase === 'descending';

/** Nooka có đang bám vào khung ô nhập không — lúc này nó đi theo mép, không theo đạo cụ. */
export const onFrame = (phase: AscentPhase) => phase === 'gripping';

/** Đang đi lên hay đi xuống dọc đạo cụ. */
export const risingUp = (phase: AscentPhase) =>
  phase === 'climbing' || phase === 'hopping' || phase === 'gripping';

/**
 * Thời lượng từng chặng.
 *
 *   lead   — chờ Nooka đi về chỗ ở rồi mới gọi đạo cụ tới
 *   fetch  — kéo thang vào và dựa lên khung
 *   drift  — quả bóng dạt tới; chậm hơn `fetch` vì nó trôi chứ không bị kéo
 *   settle — đứng vào vị trí, một nhịp lấy đà
 *   step   — một bậc thang
 *   rise   — trọn quãng bay của quả bóng
 *   hop    — cú nhảy bám khung
 *   stow   — đạo cụ rút khỏi mép trái
 */
export const ASCENT_MOVE = {
  // Đường về **xa nhất**, không phải đoạn cuối của nó: đang chìm hẳn dưới ô
  // nhập thì Nooka phải trồi lên (`dip`), hạ khỏi mép (`lift`), rồi mới đi ngang
  // về (`walk`). Lấy mỗi `walk` thì đạo cụ tới nơi trong lúc nhân vật còn đang
  // lùi ra khỏi ô nhập, và nó với lấy chiếc thang từ một chỗ không phải chỗ ở.
  lead: MASCOT_MOVE.dip + MASCOT_MOVE.lift + MASCOT_MOVE.walk,
  fetch: 560,
  drift: 760,
  settle: 220,
  step: 160,
  rise: 900,
  // Ngắn hơn mọi chặng khác, có test giữ: một cú nhảy kéo dài bằng cả nhịp lấy
  // đà thì mắt đọc ra là đang trôi ngang chứ không phải đang nhảy.
  hop: 180,
  stow: 460,
  // Rời mép mà đang đứng lệch thì **bò dọc mép về trên đầu đạo cụ đã**, rồi mới
  // nhảy. Cùng dạng với `lead`, và cùng lý do: trồi lên khỏi chỗ nấp (`dip`) rồi
  // bò về (`walk`). Bỏ quãng này thì cú nhảy về phải gánh thêm cả quãng lệch, và
  // một cú nhảy dài gấp đôi trong đúng `hop` mili giây thì mắt đọc ra là trượt
  // ngang chứ không phải nhảy — đúng thứ `hop` ngắn được đặt ra để tránh.
  rimHome: MASCOT_MOVE.dip + MASCOT_MOVE.walk,
};

export function ascentPhaseMs(phase: AscentPhase, means: AscentMeans, rungs: number): number {
  switch (phase) {
    case 'arriving':
      return means === 'ladder' ? ASCENT_MOVE.fetch : ASCENT_MOVE.drift;
    case 'ready':
      return ASCENT_MOVE.settle;
    case 'climbing':
    case 'descending':
      return means === 'ladder' ? rungs * ASCENT_MOVE.step : ASCENT_MOVE.rise;
    case 'hopping':
      return ASCENT_MOVE.hop;
    case 'leaving':
      return ASCENT_MOVE.stow;
    default:
      // `away` và `gripping` là hai đầu: đứng đó tới khi ý định đổi.
      return 0;
  }
}

/** Nooka đang diễn gì. `null` là cứ chạy hoạt cảnh của trạng thái như thường. */
export type AscentAct = 'haul' | 'catch' | 'climb' | 'float' | 'hop' | 'grip' | 'greet';

export const ASCENT_ANIMATION: Record<AscentAct, { frames: readonly FrameId[]; ms: number }> = {
  haul: { frames: ['HAUL_A', 'HAUL_B'], ms: 210 },
  catch: { frames: ['CATCH_A', 'CATCH_B'], ms: 240 },
  // Vẫy tay trên mép — **dùng lại đúng khung vẫy tay dưới đất**, cùng nhịp.
  //
  // Không có khung "vừa bám mép vừa vẫy": lưới rộng 34 ô mà cái đầu chiếm cột
  // 3–31, hai bên má không đủ chỗ cho một cánh tay dày 4 ô (đã dựng thử và xem
  // bằng mắt — xem ghi chú trong `scripts/build-mascot-sprite.js`). Mà cũng
  // không nên có: **không ai vẫy tay trong lúc treo người bằng hai bàn tay.**
  // Muốn vẫy thì phải đu lên đứng hẳn trên mép đã, và lúc đó tư thế đúng là tư
  // thế đứng vẫy sẵn có. Quãng nhấc người là `RIM_LIFT` ở `app/ask.tsx`, đúng
  // bằng quãng dùng cho lúc ngồi ngủ — cùng một việc: đưa cả người lên khỏi mép.
  greet: { frames: ['IDLE_A', 'IDLE_B'], ms: 460 },
  // Một khung một bậc: chân đổi bên đúng nhịp Nooka nhích lên.
  climb: { frames: ['CLIMB_A', 'CLIMB_B'], ms: ASCENT_MOVE.step },
  float: { frames: ['FLOAT_A', 'FLOAT_B'], ms: 520 },
  hop: { frames: ['HOP_A', 'HOP_B'], ms: 110 },
  // Treo trên khung thì đúng là đang bám mép — dùng lại cặp khung của tư thế
  // bám ô nhập, vì đó chính là việc đang xảy ra.
  grip: { frames: ['GRIP', 'GRIP_B'], ms: 700 },
};

export function ascentAct(
  phase: AscentPhase,
  means: AscentMeans,
  greeting = false,
): AscentAct | null {
  if (phase === 'away') return null;
  if (phase === 'hopping') return 'hop';
  // Chỉ **trên mép** mới có chuyện vẫy tay: đang trèo hay đang đu bóng thì hai
  // tay đều bận, và một nhân vật vừa leo thang vừa vẫy là một nhân vật sắp ngã.
  if (phase === 'gripping') return greeting ? 'greet' : 'grip';
  if (phase === 'arriving' || phase === 'leaving') return means === 'ladder' ? 'haul' : 'catch';
  if (phase === 'climbing' || phase === 'descending') return means === 'ladder' ? 'climb' : 'float';
  // `ready`: cầm thang thì buông tay đứng thẳng, cầm bóng thì đã nắm dây rồi.
  return means === 'ladder' ? null : 'float';
}

/**
 * Tâm bàn tay ở tư thế bám cách gót bao nhiêu phần chiều cao sprite.
 *
 * Đo từ lưới: hai bàn tay của khung `GRIP` nằm ở hàng 35–39 của 47, tâm ở hàng
 * 37, tức là còn 10 hàng nữa mới tới gót. Viết thành tỉ lệ chứ không phải con
 * số pt vì `MASCOT_SIZE` là quyết định của màn hình — đóng cứng 14pt ở đây thì
 * đổi cỡ linh vật là phép tính sai mà không ai thấy.
 */
export const PAW_RATIO = 10 / 47;

/**
 * Gót Nooka phải cao bao nhiêu pt để **hai bàn tay đặt đúng lên mép** một ô
 * nhập cao `fieldH`. Treo trên khung thì thân chìm sau ô nhập và chỉ cái đầu
 * nhô lên — đó là tư thế `GRIP` vốn đã được vẽ cho đúng cảnh này.
 */
export const gripRise = (fieldH: number, mascotH: number) =>
  Math.max(0, fieldH - mascotH * PAW_RATIO);

/**
 * Trốn **ngay tại mép**: buông tay, tụt xuống sau bức tường chữ, rồi trèo lại
 * lên nhìn.
 *
 * Dưới đất Nooka trốn bằng cách đi ngang vào sau ô nhập. Trên mép thì không còn
 * cách đó — đi ngang là rời khỏi mép, mà mép mới là thứ đang giữ nó. Chiều duy
 * nhất còn lại là chiều sâu, và đó cũng đúng là động tác một người đang đu trên
 * gờ tường làm khi muốn khuất: thả người xuống.
 *
 * Quãng thả **suy ra từ hình, không phải chọn bằng mắt**: đúng bằng phần thân
 * nằm trên hai bàn tay. Tư thế treo đặt tay lên mép, nên thả đúng ngần ấy là
 * đỉnh đầu hạ xuống **khít mép** — thấp hơn thì có một mẩu đầu còn nhô, cao hơn
 * thì Nooka chìm sâu hơn mức cần và lúc trồi lên phải bù một quãng thừa. Có test
 * khoá bằng chính `gripRise`, nên đổi `PAW_RATIO` là hai bên đi theo cùng nhau.
 */
export const perchSink = (mascotH: number) => mascotH * (1 - PAW_RATIO);

/**
 * Trốn ở mép được bao lâu rồi trèo lại lên nhìn.
 *
 * **Luôn ngắn hơn một lượt treo** (`DUCK_DWELL.max < PERCH_DWELL.min`, có test):
 * chỗ Nooka có việc là trên mép nhìn người dùng gõ, còn tụt xuống chỉ là một
 * lượt nghịch. Dài bằng lượt treo thì bức tường chữ thành chỗ ở, và người dùng
 * chạm vào nhân vật để rồi mất hút nó cả chục giây.
 *
 * Đây là quãng **người dùng vừa chạm vào Nooka và đang chờ xem nó làm gì**, nên
 * nó phải ngắn hơn hẳn mọi lượt nghỉ khác. Cú ú oà chỉ vui khi cái "oà" tới sớm;
 * để nhân vật khuất bốn giây thì người dùng đã quay lại gõ tiếp và bỏ lỡ đúng
 * nửa sau của trò.
 *
 * Sàn cứng là `MASCOT_MOVE.dip + walk` — cú dịch dọc mép phải xong hẳn trước lúc
 * trồi lên, nếu không Nooka hiện ra giữa lúc còn đang lướt ngang (có test). Nhưng
 * `min` **không** đặt sát sàn: hạ tới đó thì cú dịch vừa dứt là nhân vật nhô lên
 * ngay, và cả lượt nấp đọc thành một cú trượt liền mạch chứ không phải "chìm
 * xuống, đi, rồi ló ra". Chừa lại chừng nửa giây đứng yên trong bóng tối là đủ
 * để mắt kịp mất dấu nó.
 */
export const DUCK_DWELL = { min: 1200, max: 2600 };

/**
 * Nooka bám ở đâu dọc mép ô nhập: `0` là ngay trên đầu đạo cụ, `1` là lệch sang
 * phải một quãng.
 *
 * **Nấp xong thì trồi lên ở chỗ khác** — đó là cả cái gag. Chìm xuống rồi nhô
 * lên đúng chỗ cũ thì cú nấp chỉ là một nhịp nhấp nháy; đổi chỗ thì người dùng
 * mới đọc ra là nhân vật vừa đi đâu đó sau bức tường chữ.
 *
 * Chỗ bám **chỉ được đổi trong lúc Nooka đang chìm**, không bao giờ lúc đang
 * hiện. Trượt ngang dọc mép giữa thanh thiên bạch nhật là một nhân vật đang bám
 * bằng hai tay mà lại lướt đi — mắt đọc ra ngay là sai. Màn hình lo phần đó bằng
 * cách hoãn cú dịch đúng một nhịp `dip`, và `DUCK_DWELL.min` đủ dài để cú dịch
 * xong hẳn trước lúc trồi lên (có test).
 */
export type RimSpot = 0 | 1;

/** Chỗ bám kế tiếp sau một lượt nấp. Hai chỗ nên "khác chỗ hiện tại" là đổi qua lại. */
export const nextRimSpot = (spot: RimSpot): RimSpot => (spot === 0 ? 1 : 0);

/**
 * Giữ một tư thế trên mép bao lâu rồi đổi — treo yên nhìn qua, hay đu lên vẫy.
 *
 * Đúng vai trò của `PEEK_DWELL` ở `mascot.ts`, chỉ khác chỗ đứng: dưới đất Nooka
 * bốc thăm giữa nấp / bám mép / vẫy tay, trên mép thì giữa treo và vẫy. Vì vậy
 * lấy cùng khoảng thời gian — cùng một nhân vật, cùng một nhịp đổi ý, không nên
 * có hai tốc độ tuỳ chỗ nó đang đứng.
 *
 * **Ngắn hơn hẳn một lượt treo** (`PERCH_DWELL.min`), nếu không thì có những
 * lượt Nooka lên tới nơi, chưa kịp đổi tư thế lần nào đã tới giờ tụt xuống.
 */
export const PERCH_POSE_DWELL = PEEK_DWELL;

export const perchPoseDwell = (roll = Math.random()) => spread(PERCH_POSE_DWELL, roll);

/** Thiếu ít hơn ngần này thì kiễng chân là đủ, chưa đáng gọi đạo cụ ra. */
export const ASCENT_SLACK = 18;

/**
 * Nooka **tự quyết định lúc nào xuống**, không đợi người dùng gửi tin.
 *
 * Treo trên khung một lúc thì nó mỏi và tụt xuống nghỉ; nghỉ chán thì lại leo
 * lên nhìn. Ô nhập vẫn cao suốt thời gian đó — cái đổi là ý của nhân vật, không
 * phải hoàn cảnh.
 *
 * Vì sao đáng làm: treo mãi tới khi người dùng bấm gửi thì sau vài lần mở app
 * ai cũng đoán được, và nhân vật thành một món trang trí dán cứng ở mép ô nhập.
 * Lên xuống theo nhịp riêng thì nó có vẻ đang tự sống.
 *
 * **Lượt treo luôn dài hơn lượt nghỉ** — không phải trung bình mà là *mọi* lượt,
 * nên `PERCH_DWELL.min` phải vượt hẳn `GROUND_DWELL.max`. Chỗ trên khung mới là
 * nơi Nooka có việc (nhìn qua xem người dùng gõ gì); dưới đất chỉ là nghỉ chân.
 * Hai khoảng chồng nhau thì có những lượt nó nghỉ lâu hơn cả lượt treo, và dưới
 * đất thành chỗ ở. Cùng một luật với `HOME_DWELL` / `PEEK_DWELL` ở `mascot.ts`,
 * và cũng có test giữ.
 *
 * `GROUND_DWELL.min` còn phải dài hơn **trọn một chuyến đi lên**, nếu không
 * Nooka vừa đặt chân xuống đã quay đầu leo lại.
 *
 * **Hai khoảng này đua với đồng hồ ngủ, và cuộc đua đó là chỗ ngẫu nhiên đến.**
 * Người dùng ngừng gõ là `MOOD_STEPS` bắt đầu đếm; tới mức `sleep` thì Nooka
 * đứng nguyên chỗ đang đứng. Ai về đích trước quyết định lần này người dùng thấy
 * gì — ngủ luôn trên mép, tụt xuống rồi ngủ dưới đất, hay kịp xuống và leo lên
 * lại. Vì vậy khoảng treo phải **vắt qua** mốc ngủ: `max` vượt qua nó (mới có
 * những lượt ngủ trên mép) còn `min` đủ sớm để trọn một vòng xuống–lên vẫn lọt
 * (mới có những lượt đi được cả hai chiều). Cả hai vế đều có test.
 *
 * Số hiện tại cho khoảng 32% ngủ trên mép, 40% xuống rồi ngủ, 28% đi trọn vòng.
 * Đó là **chủ ý**, không phải số bốc ra: ba việc phải cùng có mặt thì nhân vật
 * mới có vẻ đang tự sống. Đổi số ở đây là đổi tỉ lệ đó — đo lại rồi hãy chốt.
 */
export const PERCH_DWELL = { min: 8200, max: 27000 };
export const GROUND_DWELL = { min: 3500, max: 7900 };

const spread = (range: { min: number; max: number }, roll: number) =>
  Math.round(range.min + roll * (range.max - range.min));

export const perchDwell = (roll = Math.random()) => spread(PERCH_DWELL, roll);
export const groundDwell = (roll = Math.random()) => spread(GROUND_DWELL, roll);
export const duckDwell = (roll = Math.random()) => spread(DUCK_DWELL, roll);

/**
 * Chặng nào là **chỗ nghỉ** — nơi đồng hồ "chán rồi, đổi chỗ" được phép chạy.
 *
 * Chỉ hai đầu của máy trạng thái. Bấm giờ ngay lúc mới có ý định thì cả quãng
 * lấy đạo cụ và leo lên ăn mất một phần lượt treo, và chiếc thang vừa dựng xong
 * đã phải dọn đi.
 */
export const ascentResting = (phase: AscentPhase) => phase === 'gripping' || phase === 'away';

/** Ở chỗ nghỉ này thì lượt kế tiếp là đi lên hay đi xuống. */
export const restingDwell = (phase: AscentPhase, roll = Math.random()) =>
  phase === 'gripping' ? perchDwell(roll) : groundDwell(roll);

/**
 * Có đáng gọi đạo cụ ra không. `peek` là quãng Nooka tự nhô lên được khi nấp
 * sau ô nhập (`BEHIND_OFFSET.y`).
 *
 * `ASCENT_SLACK` là chủ ý: vừa hụt một chút mà đã lôi thang ra thì gõ sang dòng
 * thứ hai đã thấy cả màn kịch, và nó hết là chuyện hiếm. Chừa khoảng này thì
 * đạo cụ chỉ xuất hiện từ dòng thứ ba trở đi.
 */
export const needsAscent = (rise: number, peek: number) => rise > peek + ASCENT_SLACK;

/**
 * Đường đi là **một đoạn xiên**, không phải một đường thẳng đứng: chân thang
 * đặt ở chỗ ở của Nooka còn đầu thang dựa vào mép trái khung ô nhập, nên trèo
 * lên là vừa lên vừa tiến sang phải. Quả bóng đi đúng đường ấy — bóng bay có
 * dạt ngang, mà dùng chung đường thì cú nhảy bám khung ở cuối chỉ cần vẽ một
 * lần cho cả hai.
 *
 * `run` là quãng ngang, `rise` là quãng dọc.
 */
export const ascentLength = (run: number, rise: number) => Math.hypot(run, rise);

/** Độ nghiêng của đạo cụ so với phương thẳng đứng, tính bằng độ. */
export const ascentLean = (run: number, rise: number) => (Math.atan2(run, rise) * 180) / Math.PI;

/**
 * Nooka dừng cách đầu đạo cụ ngần này pt rồi mới nhảy — chừng một bậc thang.
 *
 * **Không phải chi tiết trang trí.** Chỗ ở của Nooka rộng đúng bằng chính nó,
 * nên trèo tới sát đầu thang là nhân vật đã lọt nửa người ra sau ô nhập rồi;
 * cú nhảy sang bám khung khi ấy chỉ còn là một cú trượt ngang mà mắt không đọc
 * ra. Dừng thấp hơn một bậc thì cú nhảy thành **lên rồi mới sang**, đúng động
 * tác với tay lên mép rồi đu người qua. Và cũng đúng cách người ta trèo thang:
 * không ai đứng lên bậc trên cùng.
 */
export const HOP_REACH = 14;

/**
 * Nooka đi được bao nhiêu phần đạo cụ trước khi nhảy, theo chiều dài thân đạo
 * cụ. Đạo cụ ngắn quá thì không chừa được gì — lúc đó cứ đi hết.
 */
export const climbStop = (length: number) =>
  length > HOP_REACH * 2 ? 1 - HOP_REACH / length : 1;
