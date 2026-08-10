import assert from 'node:assert/strict';
import test from 'node:test';

import { requiresJpegNormalization } from './photo-format.ts';

test('keeps backend-supported JPEG and PNG stills unchanged', () => {
  assert.equal(requiresJpegNormalization('image/jpeg', 'photo.jpg'), false);
  assert.equal(requiresJpegNormalization('image/png', 'photo.png'), false);
});

test('normalizes iPhone HEIC and unknown still formats to JPEG', () => {
  assert.equal(requiresJpegNormalization('image/heic', 'IMG_0042.HEIC'), true);
  assert.equal(requiresJpegNormalization(undefined, 'IMG_0042.HEIF'), true);
});
