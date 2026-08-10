import assert from 'node:assert/strict';
import test from 'node:test';

import { cropTransform, updateCropFromGesture } from './photo-crop.ts';

test('portrait and landscape photos both cover the 4:5 post frame', () => {
  const portrait = cropTransform(
    { width: 3024, height: 4032, zoom: 1, offsetX: 0, offsetY: 0 },
    { width: 320, height: 400 },
  );
  const landscape = cropTransform(
    { width: 4032, height: 3024, zoom: 1, offsetX: 0, offsetY: 0 },
    { width: 320, height: 400 },
  );

  assert.ok(portrait.renderedWidth >= 320);
  assert.ok(portrait.renderedHeight >= 400);
  assert.ok(landscape.renderedWidth >= 320);
  assert.ok(landscape.renderedHeight >= 400);
});

test('gesture crop clamps zoom and normalized offsets', () => {
  assert.deepEqual(
    updateCropFromGesture({ zoom: 1, offsetX: 0, offsetY: 0 }, 9, 2, -3),
    { zoom: 3, offsetX: 1, offsetY: -1 },
  );
});
