import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EmptySource, GooglePlacesSource, type GooglePlace, createSource } from './places-source.ts';

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

test('GooglePlacesSource builds nearby URL with key', async () => {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    calls.push(url);
    return new Response(JSON.stringify({ status: 'OK', results: [] }), {
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  try {
    const source = new GooglePlacesSource('TEST_KEY');
    await source.nearby({ latitude: 10.8014, longitude: 106.7109 }, { radius: 2000 });
    assert.equal(calls.length, 1);
    assert.match(calls[0], /^https:\/\/maps\.googleapis\.com\/maps\/api\/place\/nearbysearch\/json\?/);
    assert.match(calls[0], /location=10\.8014%2C106\.7109/);
    assert.match(calls[0], /radius=2000/);
    assert.match(calls[0], /key=TEST_KEY/);
  } finally {
    globalThis.fetch = original;
  }
});

test('GooglePlacesSource parses OK response into GooglePlace[]', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        status: 'OK',
        results: [
          {
            place_id: 'p1',
            name: 'Cafe A',
            vicinity: '123 Lê Lợi',
            geometry: { location: { lat: 10.81, lng: 106.71 } },
            types: ['cafe', 'restaurant'],
            rating: 4.5,
            user_ratings_total: 120,
          },
          {
            place_id: 'p2',
            name: 'Park B',
            vicinity: '456 Pasteur',
            geometry: { location: { lat: 10.82, lng: 106.72 } },
            types: ['park'],
          },
        ],
      }),
      { headers: { 'content-type': 'application/json' } },
    )) as typeof fetch;
  try {
    const source = new GooglePlacesSource('K');
    const result = await source.nearby({ latitude: 10.8, longitude: 106.7 }, { radius: 2000 });
    assert.equal(result.source, 'google');
    assert.equal(result.places.length, 2);
    assert.deepEqual(result.places[0], {
      placeId: 'p1',
      name: 'Cafe A',
      vicinity: '123 Lê Lợi',
      lat: 10.81,
      lng: 106.71,
      types: ['cafe', 'restaurant'],
      rating: 4.5,
      userRatingsTotal: 120,
    });
    assert.equal(result.places[1].rating, undefined);
  } finally {
    globalThis.fetch = original;
  }
});

test('GooglePlacesSource throws on REQUEST_DENIED with error_message', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ status: 'REQUEST_DENIED', error_message: 'API key invalid' }),
      { headers: { 'content-type': 'application/json' } },
    )) as typeof fetch;
  try {
    const source = new GooglePlacesSource('BAD');
    await assert.rejects(
      source.nearby({ latitude: 10.8, longitude: 106.7 }, { radius: 2000 }),
      /API key invalid/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('GooglePlacesSource returns empty on ZERO_RESULTS', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ status: 'ZERO_RESULTS', results: [] }),
      { headers: { 'content-type': 'application/json' } },
    )) as typeof fetch;
  try {
    const source = new GooglePlacesSource('K');
    const result = await source.nearby({ latitude: 10.8, longitude: 106.7 }, { radius: 2000 });
    assert.deepEqual(result, { places: [], source: 'google' });
  } finally {
    globalThis.fetch = original;
  }
});

test('createSource returns EmptySource when no key available', () => {
  const original = process.env.GOOGLE_PLACES_KEY;
  delete process.env.GOOGLE_PLACES_KEY;
  try {
    const source = createSource();
    assert.ok(source instanceof EmptySource);
  } finally {
    if (original !== undefined) process.env.GOOGLE_PLACES_KEY = original;
  }
});