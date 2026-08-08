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
 *
 * **`roaming` là quyền dời Nooka, và nó dùng cho cả hai cửa.** Lịch đi lại dưới
 * đây là **thứ duy nhất đưa Nooka về nhà**: `scheduleNext` hẹn chuyến kế, còn
 * effect ở cuối file chỉ chạy đúng lúc `roaming` *đổi*. Cho nên một chuyến đi
 * trốn bắt đầu lúc quyền đã tắt là chuyến **một chiều** — không có đồng hồ nào
 * hẹn đường về, và cũng không có cạnh nào để effect bắt.
 *
 * Nooka nằm lại chỗ trốn thì phép dịch của hook này **cộng vào** phép dịch của
 * màn kịch leo ở `use-nooka-ascent.ts`: nhân vật trèo cách chiếc thang đúng một
 * quãng đi trốn, bám khung thì lơ lửng cao hơn mép đúng một quãng nhô, và tới
 * lúc ngủ thì ngồi giữa không trung. Cả ba đều là **một** lỗi.
 */
export function useMascotStage(roaming: boolean): { stage: MascotStage; hide: () => boolean } {
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

  /**
   * Đẩy Nooka đi trốn ngay, không đợi đồng hồ — dùng cho cú chạm của người dùng.
   *
   * **Trả về `false` là chuyến đi không xảy ra**, và người gọi phải có phản ứng
   * khác cho cú chạm.
   *
   * Điều kiện đúng bằng `wandering`, **không thêm không bớt**: chỗ trốn chỉ có
   * đường về nếu lịch đi lại còn chạy, mà `wandering` là chính cái công tắc ấy.
   * Đây là chỗ dễ viết hụt nhất trong hook — cú chạm không đi qua đồng hồ nên
   * cảm giác như nó là một cửa riêng, nhưng đường **về** thì vẫn phải mượn đồng
   * hồ đó. Liệt kê từng lý do bị cấm (giảm chuyển động, bị ghim, đang bận, đang
   * ngủ) là chép lại một danh sách mà `roaming` đã dựng sẵn ở người gọi, và tới
   * lúc thêm lý do thứ năm sẽ có một bản bị bỏ quên — đúng lần đó Nooka lại kẹt
   * ở chỗ trốn.
   */
  const hide = useCallback((): boolean => {
    if (!wandering) return false;
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
    return true;
  }, [wandering, go, scheduleNext]);

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
