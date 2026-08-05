import assert from 'node:assert/strict';
import { test } from 'node:test';

import { distanceMeters, regionAround, regionFor } from './geo.ts';

const BINH_THANH = { latitude: 10.8014, longitude: 106.7109 };

test('distanceMeters trả 0 khi hai điểm trùng nhau', () => {
  assert.equal(distanceMeters(BINH_THANH, BINH_THANH), 0);
});

test('distanceMeters đối xứng', () => {
  const other = { latitude: 10.7726, longitude: 106.7043 };
  const there = distanceMeters(BINH_THANH, other);
  const back = distanceMeters(other, BINH_THANH);
  assert.ok(Math.abs(there - back) < 1e-6);
});

test('distanceMeters khớp mốc đã biết trong sai số 1%', () => {
  // Một độ vĩ tuyến ≈ 111.19 km ở mọi kinh độ.
  const oneDegreeNorth = { latitude: BINH_THANH.latitude + 1, longitude: BINH_THANH.longitude };
  const measured = distanceMeters(BINH_THANH, oneDegreeNorth);
  assert.ok(Math.abs(measured - 111_195) / 111_195 < 0.01, `đo được ${measured} m`);
});

test('regionFor trả null khi không có điểm nào', () => {
  assert.equal(regionFor([]), null);
});

test('regionFor ôm hết các điểm và đặt tâm vào giữa', () => {
  const region = regionFor([
    { latitude: 10, longitude: 106 },
    { latitude: 11, longitude: 107 },
  ], { padding: 0 });

  assert.ok(region);
  assert.equal(region.latitude, 10.5);
  assert.equal(region.longitude, 106.5);
  assert.equal(region.latitudeDelta, 1);
  assert.equal(region.longitudeDelta, 1);
});

test('regionFor nới thêm theo padding', () => {
  const region = regionFor([
    { latitude: 10, longitude: 106 },
    { latitude: 11, longitude: 106 },
  ], { padding: 0.5 });

  assert.ok(region);
  assert.equal(region.latitudeDelta, 2);
});

test('regionFor giữ minDelta khi chỉ có một điểm', () => {
  const region = regionFor([BINH_THANH], { minDelta: 0.01 });

  assert.ok(region);
  assert.equal(region.latitude, BINH_THANH.latitude);
  assert.equal(region.latitudeDelta, 0.01);
  assert.equal(region.longitudeDelta, 0.01);
});

test('regionAround giữ nguyên tâm', () => {
  const region = regionAround(BINH_THANH, 0.02);

  assert.equal(region.latitude, BINH_THANH.latitude);
  assert.equal(region.longitude, BINH_THANH.longitude);
  assert.equal(region.latitudeDelta, 0.02);
});
