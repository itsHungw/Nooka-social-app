import type { FrameId } from './mascot.ts';

/**
 * Nooka buồn ngủ khi người dùng để yên.
 *
 * **Đồng hồ đếm từ phím gõ cuối cùng, không phải từ lúc vào màn hình.** Đó là
 * chỗ nó có nghĩa: nhân vật lim dim rồi ngủ vì *bạn* đang không gõ gì, chứ
 * không phải vì hết một chu kỳ hoạt cảnh. Gõ một phím là nó tỉnh ngay.
 *
 * Biểu cảm **chỉ nằm ở đôi mắt**, thân giữ nguyên tư thế đang có. Nhờ vậy cùng
 * một tâm trạng dùng được ở cả hai chỗ nghỉ — đứng dưới đất và bám mép ô nhập —
 * mà không phải vẽ hai bộ nhân vật.
 *
 * Toàn bộ file là hàm thuần, không import React — chạy được bằng `node --test`.
 */

export type NookaMood = 'awake' | 'doze' | 'sleep';

/** Nooka đang nghỉ ở đâu. Quyết định tư thế thân, không quyết định biểu cảm. */
export type NookaPerch = 'ground' | 'frame';

/**
 * Các mốc buồn ngủ, tính từ phím gõ cuối. Phải xếp **tăng dần** — có test giữ.
 *
 * Một danh sách chứ không phải hai hằng số rời: `moodFor` và `useNookaMood` đọc
 * chung đúng bảng này, nên thêm một mức nữa (ngáp? mơ?) là sửa một chỗ.
 */
export const MOOD_STEPS: readonly { after: number; mood: Exclude<NookaMood, 'awake'> }[] = [
  { after: 9000, mood: 'doze' },
  { after: 21000, mood: 'sleep' },
];

/** Tâm trạng sau `idleMs` không đụng vào gì. */
export function moodFor(idleMs: number): NookaMood {
  let mood: NookaMood = 'awake';
  for (const step of MOOD_STEPS) if (idleMs >= step.after) mood = step.mood;
  return mood;
}

/** Có phải một tâm trạng cần đổi khung hình không. `awake` thì cứ diễn như thường. */
export const isDrowsy = (mood: NookaMood): mood is Exclude<NookaMood, 'awake'> => mood !== 'awake';

/**
 * Khung hình cho từng tâm trạng ở từng chỗ nghỉ.
 *
 * Nhịp **chậm dần theo độ buồn ngủ**: lim dim chậm hơn thức, ngủ chậm hơn lim
 * dim. Một nhân vật đang ngủ mà nhịp thở nhanh bằng lúc thức thì nó không đọc
 * ra là đang ngủ.
 */
export const MOOD_ANIMATION: Record<
  NookaPerch,
  Record<Exclude<NookaMood, 'awake'>, { frames: readonly FrameId[]; ms: number }>
> = {
  ground: {
    doze: { frames: ['DOZE', 'DOZE_B'], ms: 900 },
    sleep: { frames: ['NAP', 'NAP_B'], ms: 1200 },
  },
  frame: {
    doze: { frames: ['GRIP_DOZE', 'GRIP_DOZE_B'], ms: 900 },
    // Cùng khung ngồi với dưới đất — **ngủ là ngồi, ở đâu cũng vậy**. Không ai
    // ngủ trong lúc treo người bằng hai bàn tay, nên tới mức này Nooka đu lên
    // ngồi hẳn lên mép ô nhập. Màn hình lo phần nhấc người: xem `SIT_LIFT` ở
    // `app/ask.tsx`.
    sleep: { frames: ['NAP', 'NAP_B'], ms: 1200 },
  },
};

/**
 * Đổi giữa treo và ngồi mất bao lâu.
 *
 * Đủ chậm để đọc ra là **đu người lên rồi ngồi xuống**, chứ không phải nhân vật
 * nhảy cóc một nấc lúc nhắm mắt.
 */
export const MOOD_SETTLE = 340;
