import { useEffect, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import {
  MASCOT_ANIMATION,
  MASCOT_H,
  MASCOT_PATHS,
  MASCOT_W,
  type MascotState,
} from '@/features/nooka/mascot';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

/**
 * Nooka dạng pixel, chạy theo trạng thái của một lần hỏi.
 *
 * Khác với `NookaMascot` (ảnh xuất từ clip, đứng ở thanh Hỏi Nooka ngoài Home)
 * — cái đó là nhãn thương hiệu, đứng yên. Cái này báo **máy đang làm gì**:
 * vẫy tay khi chờ, cầm kính lúp khi đọc review, reo lên khi có kết quả, rồi
 * đứng im. Vì thế nó vẽ bằng vector chứ không phải ảnh: bốn trạng thái nhân
 * hai khung hình là tám tấm ảnh phải xuất ba mật độ.
 *
 * **Tôn trọng "giảm chuyển động".** Bật tuỳ chọn đó thì linh vật đứng ở khung
 * đầu, không nhấp nháy — một hình động lặp vô hạn ngay cạnh ô nhập chính là
 * thứ tuỳ chọn ấy sinh ra để tắt.
 */
export function NookaSprite({
  state,
  size = 32,
  onSettled,
  style,
}: {
  state: MascotState;
  /** Bề ngang tính bằng pt. Chiều cao suy ra từ tỉ lệ lưới, không đặt riêng. */
  size?: number;
  /** Gọi khi hoạt cảnh hữu hạn (reo mừng) chạy hết vòng. */
  onSettled?: (next: MascotState) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useNookaTheme();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const settled = useRef(false);
  const animation = MASCOT_ANIMATION[state];

  useEffect(() => {
    setStep(0);
    settled.current = false;
  }, [state]);

  useEffect(() => {
    if (reduceMotion || animation.frames.length < 2 || !animation.ms) return;
    const timer = setInterval(() => setStep((current) => current + 1), animation.ms);
    return () => clearInterval(timer);
  }, [animation, reduceMotion]);

  // Hoạt cảnh hữu hạn: chạy đủ vòng rồi báo ra ngoài để đổi trạng thái.
  useEffect(() => {
    if (!animation.loops || !animation.then || settled.current) return;
    if (!reduceMotion && step < animation.loops * animation.frames.length) return;
    settled.current = true;
    onSettled?.(animation.then);
  }, [step, animation, reduceMotion, onSettled]);

  const frame = animation.frames[step % animation.frames.length];

  return (
    <View
      accessibilityLabel={t(`mascot.${state}`)}
      accessibilityRole="image"
      style={[{ width: size, height: Math.round((size * MASCOT_H) / MASCOT_W) }, style]}>
      <Svg height="100%" viewBox={`0 0 ${MASCOT_W} ${MASCOT_H}`} width="100%">
        {MASCOT_PATHS[frame].map((path) => (
          <Path d={path.d} fill={colors[path.token]} key={path.token} />
        ))}
      </Svg>
    </View>
  );
}
