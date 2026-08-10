import type { Colors } from '@/constants/theme';

import { MASCOT_FRAMES } from './mascot-frames.ts';

/**
 * Linh vật Nooka: bảng màu, chuỗi khung hình theo trạng thái, và hàm đổi lưới
 * pixel thành đường vẽ SVG.
 *
 * Vì sao là SVG chứ không phải View: một khung hình có ~150 dải pixel. Vẽ bằng
 * View thì thành 150 view dựng lại ba lần mỗi giây cho một món trang trí. Gộp
 * theo màu ra ~13 `Path` thì cả con linh vật chỉ còn một view native.
 *
 * Toàn bộ file là hàm thuần, không import React — chạy được bằng `node --test`.
 */

export const MASCOT_W = 34;
export const MASCOT_H = 47;

export type FrameId = keyof typeof MASCOT_FRAMES;

/** Ký tự trong lưới → tên token màu ở `constants/theme.ts`. */
export const MASCOT_PALETTE: Record<string, keyof (typeof Colors)['light']> = {
  o: 'mascotOutline',
  c: 'mascotShell',
  v: 'mascotVisor',
  V: 'mascotVisorDeep',
  d: 'mascotEye',
  h: 'mascotGleam',
  b: 'mascotBlush',
  m: 'mascotMouth',
  t: 'mascotLens',
  p: 'mascotPad',
  q: 'mascotSpark',
  g: 'accent',
  G: 'accentStrong',
};

/**
 * Bốn trạng thái, đúng vòng đời một lần hỏi:
 *
 *   idle      — chưa hỏi gì, Nooka vẫy tay
 *   searching — đang đọc review, chống cằm suy nghĩ, có dấu hỏi
 *   found     — vừa ra kết quả, nhảy lên
 *   resting   — đã xem xong, đứng yên và thở
 *
 * `found` không lặp mãi: reo hai nhịp rồi component tự chuyển sang `resting`.
 * Một linh vật nhảy không ngừng ở cạnh ô nhập là thứ người ta tắt app vì nó.
 */
export type MascotState = 'idle' | 'searching' | 'found' | 'resting';

export const MASCOT_ANIMATION: Record<
  MascotState,
  { frames: readonly FrameId[]; ms: number; loops?: number; then?: MascotState }
> = {
  idle: { frames: ['IDLE_A', 'IDLE_B'], ms: 460 },
  searching: { frames: ['THINK_A', 'THINK_B'], ms: 320 },
  found: { frames: ['YAY_A', 'YAY_B'], ms: 190, loops: 3, then: 'resting' },
  // Nhịp thở: chân đứng im, thân trên nhún một hàng. Xem `dipUpper` trong
  // `scripts/build-mascot-sprite.js`.
  //
  // 700ms một nhịp (1,4 giây trọn chu kỳ). Để 1500ms thì biên độ một ô quá nhỏ
  // so với quãng nghỉ, mắt không bắt được chuyển động và nhân vật trông như bị
  // đơ. Vẫn phải chậm hơn mọi hoạt cảnh khác — có test khoá điều đó.
  resting: { frames: ['RESTING', 'RESTING_B'], ms: 700 },
};

/**
 * Chờ = không đang đọc review, không đang reo mừng.
 *
 * Một định nghĩa dùng chung cho cả chỗ đứng lẫn tư thế. Tách làm hai bản ở hai
 * file thì đến lúc thêm trạng thái thứ năm sẽ có một bản bị bỏ quên.
 */
export const isWaiting = (state: MascotState) => state === 'idle' || state === 'resting';

/**
 * Nooka đứng ở đâu so với thanh nhập tin.
 *
 *   beside — **chỗ ở**: đứng trọn con bên trái ô nhập, diễn đúng trạng thái
 *   behind — đi trốn: nấp sau ô nhập, bốc thăm tư thế (xem `PeekPose`)
 *
 * `beside` là mặc định và là chỗ quay về. Nooka chỉ đi trốn **lúc đang chờ**;
 * người dùng hỏi một câu là nó về bên trái ngay để còn kể chuyện đang đọc
 * review — nấp sau ô nhập mà suy nghĩ thì người dùng không thấy gì.
 */
export type MascotSpot = 'beside' | 'behind' | 'right';

/**
 * Nooka nấp sau thanh nhập tin và thỉnh thoảng thò lên.
 *
 * Ba tư thế, đổi ngẫu nhiên khi đang chờ: trốn hẳn, bám hai tay vào mép thanh,
 * hoặc thò lên vẫy tay. Ngẫu nhiên là chủ ý — cố định một nhịp thì sau vài lần
 * mở app người dùng đoán được và nó thành đồ trang trí chết.
 *
 * Chỉ áp dụng khi đang ở `behind` **và đang chờ**. Khi Nooka đang đọc review
 * hay vừa ra kết quả thì tư thế phải nói đúng việc đang xảy ra, không được bốc
 * thăm.
 */
export type PeekPose = 'hidden' | 'grip' | 'wave';

export const PEEK_POSES: readonly PeekPose[] = ['hidden', 'grip', 'wave'];

export const PEEK_ANIMATION: Record<
  Exclude<PeekPose, 'hidden'>,
  { frames: readonly FrameId[]; ms: number }
> = {
  grip: { frames: ['GRIP', 'GRIP_B'], ms: 700 },
  wave: { frames: ['IDLE_A', 'IDLE_B'], ms: 460 },
};

/** Bốc tư thế kế tiếp, **không bao giờ trùng tư thế hiện tại**. */
export function nextPeekPose(current: PeekPose, roll = Math.random()): PeekPose {
  const others = PEEK_POSES.filter((pose) => pose !== current);
  return others[Math.min(others.length - 1, Math.floor(roll * others.length))];
}

/** Giữ một tư thế bao lâu trước khi đổi. Khoảng rộng để nhịp không đoán được. */
export const PEEK_DWELL = { min: 2600, max: 6200 };

export const peekDwell = (roll = Math.random()) =>
  Math.round(PEEK_DWELL.min + roll * (PEEK_DWELL.max - PEEK_DWELL.min));

/**
 * Một chặng: đang ở đâu, đang làm tư thế gì. Chỗ đứng và tư thế đi chung một
 * kiểu vì chúng ràng buộc nhau — có tư thế chỉ hợp lệ ở một chỗ.
 */
export type MascotStage = { spot: MascotSpot; pose: PeekPose };

/** Nhà: bên trái ô nhập. `pose` không dùng tới ở đây, nhưng **không được** là
 * `hidden` — ở nhà mà chìm là biến mất giữa thanh nhập. */
export const HOME_STAGE: MascotStage = { spot: 'beside', pose: 'grip' };

/** Thời gian đứng ở nhà. Luôn dài hơn một lượt giữ tư thế lúc nấp. */
export const HOME_DWELL = { min: 6400, max: 13000 };

export const homeDwell = (roll = Math.random()) =>
  Math.round(HOME_DWELL.min + roll * (HOME_DWELL.max - HOME_DWELL.min));

/** Thời gian Nooka chìm hẳn dưới ô nhập khi trốn. Rất ngắn để thụt xuống rồi nhô lên ngay. */
export const HIDE_DWELL = { min: 100, max: 110 };

export const hideDwell = (roll = Math.random()) =>
  Math.round(HIDE_DWELL.min + roll * (HIDE_DWELL.max - HIDE_DWELL.min));

export const stageDwell = (stage: MascotStage, roll = Math.random()) =>
  stage.spot === 'beside'
    ? homeDwell(roll)
    : stage.pose === 'hidden'
      ? hideDwell(roll)
      : peekDwell(roll);

/** Xác suất rời chỗ nấp về nhà ở mỗi lượt đổi tư thế. */
export const GO_HOME_CHANCE = 0.5;

/**
 * Thời gian ba đoạn di chuyển, dùng chung giữa màn hình và sprite.
 *
 *   walk — đi ngang giữa bên trái ô nhập và sau ô nhập
 *   lift — nhô lên / hạ xuống khỏi mép ô nhập, **chỉ chạy khi đã ở sau ô nhập**
 *   dip  — chìm hẳn xuống dưới ô nhập và trồi lại
 *
 * Ba đoạn này không bao giờ chạy cùng lúc: Nooka chui vào sau ô nhập rồi mới
 * lên xuống, và trồi lên hết rồi mới đi về. Lên xuống ngay ở bên trái ô nhập là
 * hiện ra từ hư không giữa thanh nhập.
 */
export const MASCOT_MOVE = { walk: 420, lift: 260, dip: 160 };

/**
 * Chặng kế tiếp. Ba luật, theo đúng thứ tự:
 *
 * 1. Từ nhà chỉ đi được sang **bám mép** ở sau ô nhập — không chìm thẳng.
 * 2. Đang chìm thì phải **trồi lên tại chỗ nấp** trước; về thẳng nhà từ dưới
 *    đáy là hiện ra ở bên trái mà không ai thấy nó đi đường nào.
 * 3. Đang thò lên thì hoặc về nhà, hoặc đổi sang tư thế nấp khác.
 */
export function nextStage({ spot, pose }: MascotStage, roll = Math.random()): MascotStage {
  if (spot === 'beside' || spot === 'right' || pose === 'hidden') return { spot: 'behind', pose: 'grip' };
  if (roll < GO_HOME_CHANCE) return HOME_STAGE;
  return {
    spot: 'behind',
    pose: nextPeekPose(pose, (roll - GO_HOME_CHANCE) / (1 - GO_HOME_CHANCE)),
  };
}

export type SpritePath = { token: keyof (typeof Colors)['light']; d: string };

/** Ký tự trong lưới → tên token màu. Mỗi món pixel khai một bảng riêng. */
export type SpritePalette = Record<string, keyof (typeof Colors)['light']>;

/**
 * Lưới ký tự → một `Path` cho mỗi màu.
 *
 * Gộp hai lượt: dải ngang trước, rồi chồng các dải **giống hệt nhau ở hàng kề**
 * thành một hình chữ nhật cao. Chỉ gộp ngang là không đủ — với hình có nhiều
 * đường cong, dải ngang bị cắt vụn và số lệnh vẽ gần bằng số ô, trong khi mảng
 * đặc lớn như vỏ đầu lẽ ra chỉ cần một hình.
 *
 * `palette` để mở vì linh vật không phải món pixel duy nhất — chiếc thang ở
 * `ladder.ts` dùng lại đúng thuật toán này với bảng màu nhôm. Chép thuật toán
 * sang file thứ hai thì đến lúc sửa cách gộp sẽ có một bản bị bỏ quên.
 */
export function spritePaths(
  rows: readonly string[],
  palette: SpritePalette = MASCOT_PALETTE,
): SpritePath[] {
  type Run = { x: number; y: number; len: number };
  const byChar = new Map<string, Run[]>();

  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') {
        x += 1;
        continue;
      }
      let len = 1;
      while (x + len < row.length && row[x + len] === ch) len += 1;
      const runs = byChar.get(ch) ?? [];
      runs.push({ x, y, len });
      byChar.set(ch, runs);
      x += len;
    }
  });

  const paths: SpritePath[] = [];

  for (const [ch, runs] of byChar) {
    const token = palette[ch];
    if (!token) continue;

    // Nhóm theo (cột bắt đầu, độ dài): chỉ những dải trùng khít mới chồng được.
    const columns = new Map<string, Run[]>();
    for (const run of runs) {
      const key = `${run.x}:${run.len}`;
      const group = columns.get(key) ?? [];
      group.push(run);
      columns.set(key, group);
    }

    const segments: string[] = [];
    for (const group of columns.values()) {
      group.sort((a, b) => a.y - b.y);
      let start = 0;
      for (let i = 1; i <= group.length; i += 1) {
        const broken = i === group.length || group[i].y !== group[i - 1].y + 1;
        if (!broken) continue;
        const { x, y, len } = group[start];
        const height = group[i - 1].y - y + 1;
        segments.push(`M${x} ${y}h${len}v${height}h-${len}z`);
        start = i;
      }
    }

    paths.push({ token, d: segments.join('') });
  }

  return paths;
}

/** Đường vẽ của mọi khung hình, tính sẵn một lần lúc nạp module. */
export const MASCOT_PATHS: Record<FrameId, SpritePath[]> = Object.fromEntries(
  (Object.keys(MASCOT_FRAMES) as FrameId[]).map((id) => [id, spritePaths(MASCOT_FRAMES[id])]),
) as Record<FrameId, SpritePath[]>;
