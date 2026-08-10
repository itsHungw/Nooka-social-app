import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { ASCENT_ANIMATION, type AscentAct } from '@/features/nooka/ascent';
import { MOOD_ANIMATION, isDrowsy, type NookaMood, type NookaPerch } from '@/features/nooka/mood';
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
 * **`act` thắng tư thế nấp và trạng thái.** Khi Nooka đang lấy đạo cụ, đang trèo
 * thang, đang treo dưới quả bóng, đang nhảy hay đang bám mép ô nhập thì đó là
 * việc đang xảy ra. Chuyện gì đang diễn ra do `useNookaAscent` quyết định; ở
 * đây chỉ diễn.
 *
 * **`mood` thắng cả `act`** — nhưng chỉ khi màn hình chịu truyền nó, và màn hình
 * chỉ truyền lúc Nooka đang **nghỉ tại chỗ**: đứng dưới đất hoặc bám mép ô nhập.
 * Buồn ngủ là chuyện của đôi mắt, còn `perch` chọn tư thế thân, nên cùng một
 * tâm trạng dùng được ở cả hai chỗ. Không ai vừa trèo thang vừa ngủ gật.
 *
 * **Tôn trọng "giảm chuyển động".** Bật tuỳ chọn đó thì đứng khung đầu — một
 * thứ tự nhảy ra nhảy vào ngay cạnh ô nhập là đúng cái tuỳ chọn ấy sinh ra để
 * tắt. (`useMascotStage` cũng giữ nó ở nhà, nên hai bên không đá nhau.)
 */
export function NookaSprite({
  state,
  size = 32,
  stage,
  act,
  mood = 'awake',
  perch,
  onSettled,
  onPress,
  style,
}: {
  state: MascotState;
  /** Bề ngang tính bằng pt. Chiều cao suy ra từ tỉ lệ lưới, không đặt riêng. */
  size?: number;
  /** Chặng hiện tại ở thanh nhập tin. Bỏ trống là vẽ trần, không xén. */
  stage?: MascotStage;
  /** Việc đang làm với đạo cụ, nếu có. Đè lên cả tư thế nấp lẫn trạng thái. */
  act?: AscentAct | null;
  /** Buồn ngủ tới đâu. Chỉ có tác dụng khi có `perch` — xem ghi chú ở trên. */
  mood?: NookaMood;
  /** Đang nghỉ ở đâu. Bỏ trống nghĩa là Nooka đang bận, không phải lúc ngủ gật. */
  perch?: NookaPerch | null;
  /** Gọi khi hoạt cảnh hữu hạn (reo mừng) chạy hết vòng. */
  onSettled?: (next: MascotState) => void;
  /** Callback gọi khi người dùng chạm vào Nooka. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useNookaTheme();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const settled = useRef(false);

  // Ngủ gật là tư thế của cả người: không nấp, không chìm, không diễn trò gì
  // khác. Chỉ có hiệu lực khi màn hình nói rõ Nooka đang nghỉ ở đâu.
  const drowsy = perch && isDrowsy(mood) ? MOOD_ANIMATION[perch][mood] : null;

  // Chỉ diễn tư thế nấp khi đã ra sau ô nhập và đang chờ. `searching` và
  // `found` có việc riêng để kể, còn `act` thì Nooka đang bận với đạo cụ chứ
  // không nấp sau cái gì cả.
  const pose = !act && !drowsy && stage?.spot === 'behind' && isWaiting(state) ? stage.pose : null;
  const hidden = pose === 'hidden' && !reduceMotion;
  const animation =
    drowsy ??
    (act
      ? ASCENT_ANIMATION[act]
      : pose && pose !== 'hidden'
        ? PEEK_ANIMATION[pose]
        : MASCOT_ANIMATION[state]);

  useEffect(() => {
    setStep(0);
    settled.current = false;
  }, [state, pose, act, drowsy]);

  useEffect(() => {
    if (reduceMotion || animation.frames.length < 2 || !animation.ms) return;
    const timer = setInterval(() => setStep((current) => current + 1), animation.ms);
    return () => clearInterval(timer);
  }, [animation, reduceMotion]);

  // Hoạt cảnh hữu hạn: chạy đủ vòng rồi báo ra ngoài để đổi trạng thái. Lúc
  // đang diễn tư thế nấp hay đang bận với chiếc thang thì không có hoạt cảnh
  // hữu hạn nào để đếm.
  useEffect(() => {
    if (pose || act || drowsy) return;
    const { loops, then, frames } = MASCOT_ANIMATION[state];
    if (!loops || !then || settled.current) return;
    if (!reduceMotion && step < loops * frames.length) return;
    settled.current = true;
    onSettled?.(then);
  }, [step, state, pose, act, drowsy, reduceMotion, onSettled]);

  const height = Math.round((size * MASCOT_H) / MASCOT_W);

  // Trốn = trượt xuống sau thanh nhập, không phải biến mất đột ngột.
  const dip = useSharedValue(0);
  useEffect(() => {
    dip.value = withTiming(hidden ? 1 : 0, { duration: MASCOT_MOVE.dip });
  }, [hidden, dip]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateY: dip.value * height }] }));

  const frame = animation.frames[step % animation.frames.length];

  // Kể đúng thứ đang xảy ra trên màn hình, theo đúng thứ tự đè nhau ở trên.
  // Đạo cụ không có nhãn riêng — kể hai lần là ồn.
  const label = t(drowsy ? `mascot.${mood}` : act ? `mascot.${act}` : `mascot.${state}`);

  const art = (
    <Svg height="100%" viewBox={`0 0 ${MASCOT_W} ${MASCOT_H}`} width="100%">
      {MASCOT_PATHS[frame].map((path) => (
        <Path d={path.d} fill={colors[path.token]} key={path.token} />
      ))}
    </Svg>
  );

  const content = stage ? (
    <View
      accessibilityLabel={label}
      accessibilityRole="image"
      style={[styles.window, { width: size, height }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, slide]}>{art}</Animated.View>
    </View>
  ) : (
    <View
      accessibilityLabel={label}
      accessibilityRole="image"
      style={[{ width: size, height }, style]}>
      {art}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  window: { overflow: 'hidden' },
});
