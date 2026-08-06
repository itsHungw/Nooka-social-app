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
  // Nhịp thở chậm: chân đứng im, thân trên nhún một hàng. Xem `dipUpper` trong
  // `scripts/build-mascot-sprite.js`.
  resting: { frames: ['RESTING', 'RESTING_B'], ms: 1500 },
};

export type SpritePath = { token: keyof (typeof Colors)['light']; d: string };

/**
 * Lưới ký tự → một `Path` cho mỗi màu.
 *
 * Gộp hai lượt: dải ngang trước, rồi chồng các dải **giống hệt nhau ở hàng kề**
 * thành một hình chữ nhật cao. Chỉ gộp ngang là không đủ — với hình có nhiều
 * đường cong, dải ngang bị cắt vụn và số lệnh vẽ gần bằng số ô, trong khi mảng
 * đặc lớn như vỏ đầu lẽ ra chỉ cần một hình.
 */
export function spritePaths(rows: readonly string[]): SpritePath[] {
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
    const token = MASCOT_PALETTE[ch];
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
