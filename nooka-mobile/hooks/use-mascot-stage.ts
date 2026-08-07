import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import {
  HOME_STAGE,
  MASCOT_MOVE,
  nextStage,
  stageDwell,
  type MascotSpot,
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
export function useMascotStage(roaming: boolean): { stage: MascotStage; hide: () => void } {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<MascotStage>(HOME_STAGE);
  const current = useRef<MascotStage>(HOME_STAGE);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const go = useCallback((next: MascotStage) => {
    current.current = next;
    setStage(next);
  }, []);

  const wandering = roaming && !reduceMotion;

  const scheduleNext = useCallback(() => {
    clearTimer();
    if (!wandering) return;
    timerRef.current = setTimeout(() => {
      const next = nextStage(current.current);
      go(next);
      scheduleNext();
    }, stageDwell(current.current));
  }, [wandering, clearTimer, go]);

  const hide = useCallback(() => {
    if (reduceMotion) return;
    // Nếu Nooka đang bám ở sau ô nhập (`behind`), chọn ngẫu nhiên 50/50:
    // chạy sang bên trái (`beside`) hoặc bên phải (`right`).
    let targetSpot: MascotSpot;
    if (current.current.spot === 'behind') {
      targetSpot = Math.random() < 0.5 ? 'beside' : 'right';
    } else {
      targetSpot = 'behind';
    }
    const targetPose = targetSpot === 'behind' ? 'hidden' : 'grip';
    go({ spot: targetSpot, pose: targetPose });
    scheduleNext();
  }, [reduceMotion, go, scheduleNext]);

  useEffect(() => {
    if (wandering) {
      scheduleNext();
      return () => clearTimer();
    }

    if (current.current.pose === 'hidden') {
      go({ spot: 'behind', pose: 'grip' });
      timerRef.current = setTimeout(() => go(HOME_STAGE), MASCOT_MOVE.dip);
      return () => clearTimer();
    }

    go(HOME_STAGE);
    return () => clearTimer();
  }, [wandering, go, scheduleNext, clearTimer]);

  return { stage, hide };
}
