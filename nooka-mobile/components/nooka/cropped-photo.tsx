import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { useState, type PropsWithChildren } from 'react';

import type { DraftPhoto } from '@/features/nooka/draft-photo';
import { cropTransform } from '@/features/nooka/photo-crop';

export function CroppedPhoto({
  photo,
  children,
  style,
  imageStyle,
}: PropsWithChildren<{
  photo: DraftPhoto;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}>) {
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const transform = frame.width && frame.height
    ? cropTransform({ ...photo.crop, width: photo.width, height: photo.height }, frame)
    : null;

  return (
    <View
      onLayout={(event) => setFrame(event.nativeEvent.layout)}
      style={[styles.frame, style]}>
      {transform ? (
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="stretch"
          source={{ uri: photo.uri }}
          style={[
            styles.image,
            {
              width: transform.renderedWidth,
              height: transform.renderedHeight,
              left: (frame.width - transform.renderedWidth) / 2 + transform.translateX,
              top: (frame.height - transform.renderedHeight) / 2 + transform.translateY,
            },
            imageStyle,
          ]}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
  image: { position: 'absolute' },
});
