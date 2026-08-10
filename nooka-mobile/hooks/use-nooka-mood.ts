import { useEffect, useState } from 'react';

import { MOOD_STEPS, type NookaMood } from '@/features/nooka/mood';

/**
 * Nooka lim dim rồi ngủ khi người dùng để yên.
 *
 * `since` là mốc thời gian của phím gõ cuối cùng — đổi giá trị là đồng hồ chạy
 * lại từ đầu và nhân vật tỉnh ngay. Truyền `Date.now()` thẳng vào lúc render
 * thì nó đổi mỗi lần vẽ và Nooka không bao giờ ngủ được; phải là một state chỉ
 * đổi khi có gõ thật.
 *
 * `active` tắt là tỉnh: lúc Nooka đang đọc review, đang reo mừng, hay đang leo
 * thang thì nó có việc, không phải lúc ngủ gật.
 *
 * Hẹn giờ theo `MOOD_STEPS` chứ không đếm từng nhịp: một nhân vật đứng yên
 * không đáng để màn hình vẽ lại mỗi giây chỉ để biết đã tới lúc nhắm mắt chưa.
 */
export function useNookaMood(since: number, active: boolean): NookaMood {
  const [mood, setMood] = useState<NookaMood>('awake');

  useEffect(() => {
    setMood('awake');
    if (!active) return;
    const timers = MOOD_STEPS.map((step) => setTimeout(() => setMood(step.mood), step.after));
    return () => timers.forEach(clearTimeout);
  }, [since, active]);

  return active ? mood : 'awake';
}
