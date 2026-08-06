import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EmptySource, type GooglePlace } from './places-source.ts';

test('EmptySource returns empty list', async () => {
  const source = new EmptySource();
  const result = await source.nearby({ latitude: 10.8, longitude: 106.7 }, { radius: 2000 });
  assert.deepEqual(result, { places: [], source: 'empty' });
});

test('GooglePlace type has expected fields', () => {
  const place: GooglePlace = {
    placeId: 'abc',
    name: 'Cafe X',
    vicinity: 'Quận 1',
    lat: 10.8,
    lng: 106.7,
    types: ['cafe'],
  };
  assert.equal(place.placeId, 'abc');
});