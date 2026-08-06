import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import {
  HOME_STAGE,
  MASCOT_MOVE,
  nextStage,
  stageDwell,
  type MascotStage,
} from '@/features/nooka/mascot';

/**
 * Nooka đi đi về về quanh thanh nhập tin.
 *
 * Nhà là **bên trái ô nhập**. Lúc đang chờ, thỉnh thoảng nó chui vào sau ô nhập
 * một lát — thò lên, bám mép, có khi chìm hẳn — rồi lại về chỗ cũ. Thời điểm
 * bốc ngẫu nhiên để nhịp không đoán được; luật đường đi nằm ở `nextStage`.
 *
 * `roaming` tắt là về nhà, nhưng **vẫn đúng lối**: đang chìm dưới ô nhập thì
 * trồi lên tại chỗ đã rồi mới đi về, không nhảy cóc. Khi Nooka đang đọc review
 * hay vừa reo mừng thì nó phải đứng trọn con bên trái để người dùng thấy nó
 * đang làm gì.
 *
 * "Giảm chuyển động" của hệ thống thì đứng yên ở nhà — thứ tự chui ra chui vào
 * ngay cạnh ô nhập là đúng cái tuỳ chọn ấy sinh ra để tắt.
 */
export function useMascotStage(roaming: boolean): MascotStage {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<MascotStage>(HOME_STAGE);
  // Vòng lặp tự hẹn giờ nên phải đọc được chặng hiện tại mà không cần dựng lại
  // effect sau mỗi bước — dựng lại là mỗi bước reset đồng hồ của bước sau.
  const current = useRef<MascotStage>(HOME_STAGE);
  const go = useCallback((next: MascotStage) => {
    current.current = next;
    setStage(next);
  }, []);

  const wandering = roaming && !reduceMotion;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (wandering) {
      const schedule = () => {
        timer = setTimeout(() => {
          go(nextStage(current.current));
          schedule();
        }, stageDwell(current.current));
      };
      schedule();
      return () => clearTimeout(timer);
    }

    if (current.current.pose === 'hidden') {
      go({ spot: 'behind', pose: 'grip' });
      timer = setTimeout(() => go(HOME_STAGE), MASCOT_MOVE.dip);
      return () => clearTimeout(timer);
    }

    go(HOME_STAGE);
    return;
  }, [wandering, go]);

  return stage;
}
