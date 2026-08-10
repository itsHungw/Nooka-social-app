import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import type { DraftPhoto } from '@/features/nooka/draft-photo';
import { cropTransform, updateCropFromGesture, type CropState } from '@/features/nooka/photo-crop';

export function PhotoCropEditor({ photo, onChange }: {
  photo: DraftPhoto;
  onChange: (crop: CropState) => void;
}) {
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const zoom = useSharedValue(photo.crop.zoom);
  const offsetX = useSharedValue(photo.crop.offsetX);
  const offsetY = useSharedValue(photo.crop.offsetY);
  const startZoom = useSharedValue(photo.crop.zoom);
  const startX = useSharedValue(photo.crop.offsetX);
  const startY = useSharedValue(photo.crop.offsetY);

  useEffect(() => {
    zoom.value = photo.crop.zoom;
    offsetX.value = photo.crop.offsetX;
    offsetY.value = photo.crop.offsetY;
  }, [offsetX, offsetY, photo.crop, photo.id, zoom]);

  const commit = useCallback((nextZoom: number, nextX: number, nextY: number) => {
    onChange(updateCropFromGesture({ zoom: nextZoom, offsetX: 0, offsetY: 0 }, 1, nextX, nextY));
  }, [onChange]);

  const coverScale = frame.width && frame.height
    ? Math.max(frame.width / photo.width, frame.height / photo.height)
    : 1;
  const baseWidth = photo.width * coverScale;
  const baseHeight = photo.height * coverScale;

  const pan = useMemo(() => Gesture.Pan()
    .onBegin(() => {
      startX.value = offsetX.value;
      startY.value = offsetY.value;
    })
    .onUpdate((event) => {
      const maxX = Math.max(1, (baseWidth * zoom.value - frame.width) / 2);
      const maxY = Math.max(1, (baseHeight * zoom.value - frame.height) / 2);
      offsetX.value = Math.max(-1, Math.min(1, startX.value + event.translationX / maxX));
      offsetY.value = Math.max(-1, Math.min(1, startY.value + event.translationY / maxY));
    })
    .onEnd(() => runOnJS(commit)(zoom.value, offsetX.value, offsetY.value)),
  [baseHeight, baseWidth, commit, frame.height, frame.width, offsetX, offsetY, startX, startY, zoom]);

  const pinch = useMemo(() => Gesture.Pinch()
    .onBegin(() => { startZoom.value = zoom.value; })
    .onUpdate((event) => { zoom.value = Math.max(1, Math.min(3, startZoom.value * event.scale)); })
    .onEnd(() => runOnJS(commit)(zoom.value, offsetX.value, offsetY.value)),
  [commit, offsetX, offsetY, startZoom, zoom]);

  const animatedImage = useAnimatedStyle(() => {
    const computed = cropTransform(
      { width: photo.width, height: photo.height, zoom: zoom.value, offsetX: offsetX.value, offsetY: offsetY.value },
      frame,
    );
    return {
      width: computed.renderedWidth,
      height: computed.renderedHeight,
      left: (frame.width - computed.renderedWidth) / 2,
      top: (frame.height - computed.renderedHeight) / 2,
      transform: [{ translateX: computed.translateX }, { translateY: computed.translateY }],
    };
  });

  return (
    <View onLayout={(event) => setFrame(event.nativeEvent.layout)} style={styles.frame}>
      {frame.width && frame.height ? (
        <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
          <Animated.Image
            accessibilityIgnoresInvertColors
            resizeMode="stretch"
            source={{ uri: photo.uri }}
            style={[styles.image, animatedImage]}
          />
        </GestureDetector>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, overflow: 'hidden' },
  image: { position: 'absolute' },
});
