import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchNearby } from './use-nearby-places.ts';

const withFetchSpy = async <T>(fn: (calls: string[]) => Promise<T>): Promise<{ calls: string[]; result: T }> => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    calls.push(url);
    return new Response(JSON.stringify({ status: 'OK', results: [] }), {
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  try {
    const result = await fn(calls);
    return { calls, result };
  } finally {
    globalThis.fetch = original;
  }
};

test('fetchNearby dedupes concurrent calls with same key', async () => {
  const originalKey = process.env.GOOGLE_PLACES_KEY;
  process.env.GOOGLE_PLACES_KEY = 'TEST_KEY';
  try {
    const { calls, result } = await withFetchSpy(async () => {
      const center = { latitude: 10.8014, longitude: 106.7109 };
      const [a, b] = await Promise.all([
        fetchNearby(center, { radius: 2000 }),
        fetchNearby(center, { radius: 2000 }),
      ]);
      return { a, b };
    });
    assert.equal(calls.length, 1);
    assert.equal(result.a.places.length, 0);
    assert.equal(result.b.places.length, 0);
  } finally {
    if (originalKey === undefined) delete process.env.GOOGLE_PLACES_KEY;
    else process.env.GOOGLE_PLACES_KEY = originalKey;
  }
});

test('fetchNearby returns cached result within TTL', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GOOGLE_PLACES_KEY;
  const calls: string[] = [];
  process.env.GOOGLE_PLACES_KEY = 'TEST_KEY';
  globalThis.fetch = (async (url: string) => {
    calls.push(url);
    return new Response(
      JSON.stringify({
        status: 'OK',
        results: [
          {
            place_id: 'p1',
            name: 'Cafe',
            geometry: { location: { lat: 10.8, lng: 106.7 } },
            types: ['cafe'],
          },
        ],
      }),
      { headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;
  try {
    const center = { latitude: 10.8123, longitude: 106.7234 };
    const a = await fetchNearby(center, { radius: 1500 });
    const b = await fetchNearby(center, { radius: 1500 });
    assert.equal(calls.length, 1);
    assert.equal(a.places[0].name, 'Cafe');
    assert.equal(b.places[0].name, 'Cafe');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GOOGLE_PLACES_KEY;
    else process.env.GOOGLE_PLACES_KEY = originalKey;
  }
});
