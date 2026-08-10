import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decodePolyline } from './geo.ts';

test('decodePolyline giải mã được polyline chuẩn của Google', () => {
  assert.deepEqual(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@'), [
    { latitude: 38.5, longitude: -120.2 },
    { latitude: 40.7, longitude: -120.95 },
    { latitude: 43.252, longitude: -126.453 },
  ]);
});
