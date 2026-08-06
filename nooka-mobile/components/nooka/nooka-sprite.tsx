import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import {
  MASCOT_ANIMATION,
  MASCOT_H,
  MASCOT_MOVE,
  MASCOT_PATHS,
  MASCOT_W,
  PEEK_ANIMATION,
  isWaiting,
  type MascotStage,
  type MascotState,
} from '@/features/nooka/mascot';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

/**
 * Nooka dạng pixel, chạy theo trạng thái của một lần hỏi.
 *
 * Khác với `NookaMascot` (ảnh xuất từ clip, đứng ở thanh Hỏi Nooka ngoài Home)
 * — cái đó là nhãn thương hiệu, đứng yên. Cái này báo **máy đang làm gì**.
 *
 * Truyền `stage` khi đặt nó ở thanh nhập tin của `app/ask.tsx`. Đường đi và
 * thời điểm do `useMascotStage` quyết định — ở đây chỉ diễn:
 *
 *   beside — đứng trọn con bên trái ô nhập, chạy đúng hoạt cảnh của trạng thái
 *   behind — nấp sau ô nhập: bám mép, thò lên vẫy, hoặc chìm hẳn xuống
 *
 * Lúc đang đọc review hay vừa ra kết quả thì bỏ qua tư thế nấp, dùng đúng hoạt
 * cảnh của trạng thái — tư thế phải nói đúng việc đang xảy ra.
 *
 * **Tôn trọng "giảm chuyển động".** Bật tuỳ chọn đó thì đứng khung đầu — một
 * thứ tự nhảy ra nhảy vào ngay cạnh ô nhập là đúng cái tuỳ chọn ấy sinh ra để
 * tắt. (`useMascotStage` cũng giữ nó ở nhà, nên hai bên không đá nhau.)
 */
export function NookaSprite({
  state,
  size = 32,
  stage,
  onSettled,
  style,
}: {
  state: MascotState;
  /** Bề ngang tính bằng pt. Chiều cao suy ra từ tỉ lệ lưới, không đặt riêng. */
  size?: number;
  /** Chặng hiện tại ở thanh nhập tin. Bỏ trống là vẽ trần, không xén. */
  stage?: MascotStage;
  /** Gọi khi hoạt cảnh hữu hạn (reo mừng) chạy hết vòng. */
  onSettled?: (next: MascotState) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useNookaTheme();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const settled = useRef(false);

  // Chỉ diễn tư thế nấp khi đã ra sau ô nhập và đang chờ. `searching` và
  // `found` có việc riêng để kể.
  const pose = stage?.spot === 'behind' && isWaiting(state) ? stage.pose : null;
  const hidden = pose === 'hidden' && !reduceMotion;
  const animation = pose && pose !== 'hidden' ? PEEK_ANIMATION[pose] : MASCOT_ANIMATION[state];

  useEffect(() => {
    setStep(0);
    settled.current = false;
  }, [state, pose]);

  useEffect(() => {
    if (reduceMotion || animation.frames.length < 2 || !animation.ms) return;
    const timer = setInterval(() => setStep((current) => current + 1), animation.ms);
    return () => clearInterval(timer);
  }, [animation, reduceMotion]);

  // Hoạt cảnh hữu hạn: chạy đủ vòng rồi báo ra ngoài để đổi trạng thái. Lúc
  // đang diễn tư thế nấp thì không có hoạt cảnh hữu hạn nào để đếm.
  useEffect(() => {
    if (pose) return;
    const { loops, then, frames } = MASCOT_ANIMATION[state];
    if (!loops || !then || settled.current) return;
    if (!reduceMotion && step < loops * frames.length) return;
    settled.current = true;
    onSettled?.(then);
  }, [step, state, pose, reduceMotion, onSettled]);

  const height = Math.round((size * MASCOT_H) / MASCOT_W);

  // Trốn = trượt xuống sau thanh nhập, không phải biến mất đột ngột.
  const dip = useSharedValue(0);
  useEffect(() => {
    dip.value = withTiming(hidden ? 1 : 0, { duration: MASCOT_MOVE.dip });
  }, [hidden, dip]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateY: dip.value * height }] }));

  const frame = animation.frames[step % animation.frames.length];

  const art = (
    <Svg height="100%" viewBox={`0 0 ${MASCOT_W} ${MASCOT_H}`} width="100%">
      {MASCOT_PATHS[frame].map((path) => (
        <Path d={path.d} fill={colors[path.token]} key={path.token} />
      ))}
    </Svg>
  );

  if (!stage) {
    return (
      <View
        accessibilityLabel={t(`mascot.${state}`)}
        accessibilityRole="image"
        style={[{ width: size, height }, style]}>
        {art}
      </View>
    );
  }

  // Khung cắt: trốn là **trượt xuống rồi bị xén**, không phải trượt xuống rồi
  // ló ra dưới ô nhập. Thiếu `overflow: hidden` thì Nooka rơi xuống vùng đệm
  // dưới thanh và người dùng thấy trọn con đang tụt.
  return (
    <View
      accessibilityLabel={t(`mascot.${state}`)}
      accessibilityRole="image"
      style={[styles.window, { width: size, height }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, slide]}>{art}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  window: { overflow: 'hidden' },
});
