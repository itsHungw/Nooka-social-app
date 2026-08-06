import { useEffect } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { useNookaTheme } from '@/hooks/use-nooka-theme';

/**
 * Sheet ba điểm dừng cho tab Tìm.
 *
 * Cử chỉ kéo chỉ gắn vào phần `header`, không gắn vào cả sheet. Kéo ở đâu cũng
 * được thì phải điều phối giữa pan của sheet và scroll của danh sách bên trong,
 * và đó là chỗ hầu hết bug của bottom sheet sinh ra. Kéo tay cầm để đổi điểm
 * dừng, cuộn thân để xem tiếp — hai việc, hai vùng.
 */

const SPRING = { damping: 22, stiffness: 190, mass: 0.6 };

type NookaSheetProps = {
  /** Chiều cao mỗi điểm dừng, tăng dần. Điểm cuối là chiều cao thật của sheet. */
  snapHeights: readonly number[];
  index: number;
  onIndexChange: (index: number) => void;
  header: React.ReactNode;
  children: React.ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export function NookaSheet({
  snapHeights,
  index,
  onIndexChange,
  header,
  children,
  onLayout,
}: NookaSheetProps) {
  const { colors } = useNookaTheme();
  const height = snapHeights[snapHeights.length - 1];
  const offsets = snapHeights.map((snap) => height - snap);

  const translateY = useSharedValue(offsets[index] ?? 0);
  const start = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(offsets[index] ?? 0, SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, height]);

  const pan = Gesture.Pan()
    .onStart(() => {
      start.value = translateY.value;
    })
    .onUpdate((event) => {
      const next = start.value + event.translationY;
      translateY.value = Math.min(Math.max(next, offsets[offsets.length - 1]), offsets[0]);
    })
    .onEnd((event) => {
      // Chiếu theo vận tốc: hất nhanh thì nhảy qua điểm dừng kế bên, đúng cảm
      // giác của sheet hệ thống. 0.12 là hệ số quán tính, chỉnh bằng tay.
      const projected = translateY.value + event.velocityY * 0.12;
      let best = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < offsets.length; i += 1) {
        const distance = Math.abs(offsets[i] - projected);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      }
      translateY.value = withSpring(offsets[best], SPRING);
      runOnJS(onIndexChange)(best);
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.sheet,
        { height, backgroundColor: colors.surface, shadowColor: colors.shadow },
        sheetStyle,
      ]}>
      <GestureDetector gesture={pan}>
        <View>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          {header}
        </View>
      </GestureDetector>
      <View style={styles.body}>{children}</View>
    </Animated.View>
  );
}

/** Vị trí mép trên của sheet, để màn hình biết chừa bao nhiêu chỗ cho bản đồ. */
export function sheetTop(snapHeights: readonly number[], index: number): number {
  return snapHeights[index] ?? snapHeights[0];
}

export type { SharedValue };

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 16,
  },
  grabber: { width: 40, height: 4.5, borderRadius: 3, alignSelf: 'center', marginTop: 10 },
  body: { flex: 1 },
});
