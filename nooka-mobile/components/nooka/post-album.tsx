import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  ReduceMotion,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CroppedPhoto } from '@/components/nooka/cropped-photo';
import { Photo } from '@/components/nooka/ui';
import type { DraftPhoto } from '@/features/nooka/draft-photo';
import type { PhotoTint } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

type PostAlbumProps = {
  photos: PostPhoto[];
  caption: string;
  onOpenSpot: () => void;
};

type AlbumSurfaceProps = {
  caption: string;
  index: number;
  photo: PostPhoto;
  total: number;
};

type PostPhoto = PhotoTint | DraftPhoto;

const SWIPE_DISTANCE = 78;
const SWIPE_VELOCITY = 650;
const EXIT_X = 480;
const RETURN_SPRING = {
  damping: 22,
  stiffness: 260,
  mass: 0.72,
  reduceMotion: ReduceMotion.System,
} as const;

function AlbumSurface({ caption, index, photo, total }: AlbumSurfaceProps) {
  const { colors } = useNookaTheme();
  const overlay = (
    <>
      <View style={[styles.photoBadge, { backgroundColor: colors.background }]}>
        <Text style={[styles.photoBadgeText, { color: colors.textMuted }]}>{t('home.photoBadge')}</Text>
      </View>
      {total > 1 ? (
        <View style={[styles.counter, { backgroundColor: colors.photoScrim }]}>
          <Text style={[styles.counterText, { color: colors.captionText }]}>{index + 1}/{total}</Text>
        </View>
      ) : null}
      <View style={[styles.captionBand, { backgroundColor: colors.photoScrim }]}>
        <Text numberOfLines={3} style={[styles.captionText, { color: colors.captionText }]}>{caption}</Text>
      </View>
    </>
  );

  return typeof photo === 'string'
    ? <Photo style={styles.photo} tint={photo}>{overlay}</Photo>
    : <CroppedPhoto photo={photo} style={styles.photo}>{overlay}</CroppedPhoto>;
}

/**
 * Card trên cùng bay khỏi stack như bản motion ban đầu. Ảnh trước và ảnh sau được
 * dựng sẵn ở dưới, rồi scale/rotate lên đồng thời với ngón tay — không đợi đổi state
 * mới mount ảnh kế tiếp.
 */
export function PostAlbum({ photos, caption, onOpenSpot }: PostAlbumProps) {
  const safePhotos: PostPhoto[] = photos.length ? photos : ['photoWarm'];
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const tapPressed = useSharedValue(0);
  const translateX = useSharedValue(0);
  const current = safePhotos[activeIndex];
  const previous = activeIndex > 0 ? safePhotos[activeIndex - 1] : null;
  const next = activeIndex < safePhotos.length - 1 ? safePhotos[activeIndex + 1] : null;
  const farBack = safePhotos[Math.min(safePhotos.length - 1, activeIndex + 2)];
  const isAlbum = safePhotos.length > 1;

  useLayoutEffect(() => {
    translateX.value = 0;
  }, [activeIndex, translateX]);

  const commitSwipe = useCallback((direction: number) => {
    setActiveIndex((index) => Math.min(safePhotos.length - 1, Math.max(0, index + direction)));
  }, [safePhotos.length]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isAlbum)
        .activeOffsetX([-12, 12])
        .failOffsetY([-10, 10])
        .onUpdate((event) => {
          const movingPastStart = activeIndex === 0 && event.translationX > 0;
          const movingPastEnd = activeIndex === safePhotos.length - 1 && event.translationX < 0;
          translateX.value = movingPastStart || movingPastEnd ? event.translationX * 0.18 : event.translationX;
        })
        .onEnd((event) => {
          const direction = event.translationX < 0 ? 1 : -1;
          const canMove = direction > 0 ? activeIndex < safePhotos.length - 1 : activeIndex > 0;
          const shouldMove = Math.abs(event.translationX) > SWIPE_DISTANCE || Math.abs(event.velocityX) > SWIPE_VELOCITY;

          if (!canMove || !shouldMove) {
            translateX.value = withSpring(0, RETURN_SPRING);
            return;
          }

          translateX.value = withTiming(
            direction > 0 ? -EXIT_X : EXIT_X,
            {
              duration: 190,
              easing: Easing.in(Easing.cubic),
              reduceMotion: ReduceMotion.System,
            },
            (finished) => {
              if (finished) runOnJS(commitSwipe)(direction);
            },
          );
        }),
    [activeIndex, commitSwipe, isAlbum, safePhotos.length, translateX],
  );

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDistance(8)
        .maxDuration(350)
        .onBegin(() => {
          tapPressed.value = 1;
        })
        .onFinalize(() => {
          tapPressed.value = 0;
        })
        .onEnd((_, success) => {
          if (success) runOnJS(onOpenSpot)();
        }),
    [onOpenSpot, tapPressed],
  );

  const composedGesture = useMemo(() => Gesture.Race(pan, tap), [pan, tap]);

  const frontStyle = useAnimatedStyle(() => ({
    opacity: tapPressed.value ? 0.94 : 1,
    transform: reduceMotion
      ? [{ translateX: translateX.value }]
      : [
          { perspective: 900 },
          { translateX: translateX.value },
          { translateY: interpolate(Math.abs(translateX.value), [0, EXIT_X], [0, 12], Extrapolation.CLAMP) },
          { rotateZ: `${interpolate(translateX.value, [-EXIT_X, 0, EXIT_X], [-7, 0, 7], Extrapolation.CLAMP)}deg` },
        ],
  }));

  const nextStyle = useAnimatedStyle(() => {
    const progress = interpolate(translateX.value, [-EXIT_X, 0], [1, 0], Extrapolation.CLAMP);
    return {
      opacity: interpolate(translateX.value, [-EXIT_X, 0, 1], [1, 0.94, 0], Extrapolation.CLAMP),
      transform: reduceMotion
        ? []
        : [
            { translateX: interpolate(progress, [0, 1], [10, 0]) },
            { translateY: interpolate(progress, [0, 1], [-9, 0]) },
            { rotateZ: `${interpolate(progress, [0, 1], [3.4, 0])}deg` },
            { scale: interpolate(progress, [0, 1], [0.97, 1]) },
          ],
    };
  });

  const previousStyle = useAnimatedStyle(() => {
    const progress = interpolate(translateX.value, [0, EXIT_X], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: progress,
      transform: reduceMotion
        ? []
        : [
            { translateX: interpolate(progress, [0, 1], [-10, 0]) },
            { translateY: interpolate(progress, [0, 1], [-8, 0]) },
            { rotateZ: `${interpolate(progress, [0, 1], [-3.2, 0])}deg` },
            { scale: interpolate(progress, [0, 1], [0.97, 1]) },
          ],
    };
  });

  return (
    <View style={[styles.shell, isAlbum ? styles.albumShell : null]}>
      {isAlbum ? (
        typeof farBack === 'string'
          ? <Photo style={[styles.backCard, styles.farBack]} tint={farBack} />
          : <CroppedPhoto photo={farBack} style={[styles.backCard, styles.farBack]} />
      ) : null}

      {next ? (
        <Animated.View pointerEvents="none" style={[styles.backCard, nextStyle]}>
          <AlbumSurface caption={caption} index={activeIndex + 1} photo={next} total={safePhotos.length} />
        </Animated.View>
      ) : null}

      {previous ? (
        <Animated.View pointerEvents="none" style={[styles.backCard, previousStyle]}>
          <AlbumSurface caption={caption} index={activeIndex - 1} photo={previous} total={safePhotos.length} />
        </Animated.View>
      ) : null}

      <GestureDetector gesture={composedGesture}>
        <Animated.View
          accessibilityActions={[{ name: 'activate' }]}
          accessibilityLabel={t('feed.openAlbumPhoto', { count: activeIndex + 1, total: safePhotos.length })}
          accessibilityRole="button"
          accessible
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'activate') onOpenSpot();
          }}
          style={[styles.frontCard, frontStyle]}>
          <AlbumSurface caption={caption} index={activeIndex} photo={current} total={safePhotos.length} />
        </Animated.View>
      </GestureDetector>

      <View pointerEvents="none" style={styles.preloadStrip}>
        {safePhotos.map((photo, index) => typeof photo === 'string'
          ? <Photo key={`${photo}-${index}`} style={styles.preloadPhoto} tint={photo} />
          : <CroppedPhoto key={photo.id} photo={photo} style={styles.preloadPhoto} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { width: '100%', aspectRatio: 4 / 5, alignSelf: 'center', marginHorizontal: 4, marginTop: 6, marginBottom: 2 },
  albumShell: { marginHorizontal: 10, marginTop: 16, marginBottom: 7 },
  backCard: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 22, overflow: 'hidden' },
  farBack: {
    left: -7,
    right: 11,
    transform: [{ translateY: -7 }, { rotate: '-3deg' }, { scale: 0.985 }],
    opacity: 0.84,
  },
  frontCard: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  photo: { flex: 1 },
  photoBadge: { position: 'absolute', left: 12, top: 12, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  photoBadgeText: { fontSize: 10, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' },
  counter: { position: 'absolute', right: 12, top: 12, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  counterText: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
  captionBand: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingVertical: 15 },
  captionText: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  preloadStrip: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  preloadPhoto: { width: 1, height: 1 },
});
