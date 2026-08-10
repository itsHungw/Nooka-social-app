export type CropState = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export type PhotoCrop = CropState & {
  width: number;
  height: number;
};

export type FrameSize = {
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

export function updateCropFromGesture(
  current: CropState,
  zoomFactor: number,
  offsetX: number,
  offsetY: number,
): CropState {
  return {
    zoom: clamp(current.zoom * zoomFactor, 1, 3),
    offsetX: clamp(offsetX, -1, 1),
    offsetY: clamp(offsetY, -1, 1),
  };
}

export function cropTransform(photo: PhotoCrop, frame: FrameSize) {
  'worklet';
  const coverScale = Math.max(frame.width / photo.width, frame.height / photo.height);
  const scale = coverScale * clamp(photo.zoom, 1, 3);
  const renderedWidth = photo.width * scale;
  const renderedHeight = photo.height * scale;
  const maxTranslateX = Math.max(0, (renderedWidth - frame.width) / 2);
  const maxTranslateY = Math.max(0, (renderedHeight - frame.height) / 2);

  return {
    renderedWidth,
    renderedHeight,
    translateX: clamp(photo.offsetX, -1, 1) * maxTranslateX,
    translateY: clamp(photo.offsetY, -1, 1) * maxTranslateY,
  };
}
