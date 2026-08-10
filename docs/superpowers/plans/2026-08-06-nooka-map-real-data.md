# Tab Tìm dùng Google Places — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tab Tìm (`app/(tabs)/search.tsx`) hiển thị địa điểm thật từ Google Places xung quanh `USER_LOCATION`. Bốn chỗ giả + flow check-in + feed + saved + profile giữ nguyên.

**Architecture:** Module thuần `places-source.ts` (`fetch` + parse + cache) → hook `use-nearby-places.ts` (React state) → `search.tsx` (gọi hook, render overlay + sheet). `NookaMap` thêm prop `pins` cho pin Google. `app.config.js` đọc `GOOGLE_PLACES_KEY` env vào `extra`. Không thêm dependency.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript strict, `react-native-maps` 1.20.1, `expo-constants` ~18.0.13, `fetch` chuẩn RN, `node --test` cho unit test.

## Global Constraints

- Expo SDK 54 ghim, không nâng (`nooka-mobile/AGENTS.md`).
- `USER_LOCATION` là hằng số, không gọi `expo-location` (§13).
- Không thêm dependency mới.
- Không commit credential: `GOOGLE_PLACES_KEY` chỉ từ env/EAS secret.
- Hardcode locale cấm trong JSX — mọi chuỗi mới qua `t()`.
- Pin Google là **một pin số cluster** ở giữa viewport, không phải mỗi quán một pin (theo spec).
- Git hook `core.hooksPath .githooks` phải bật trước commit (luật repo gốc).
- Trước khi báo xong: `npm run lint` + `npx tsc --noEmit` + `npx expo-doctor` sạch.
- Test command: `node --test features/nooka/places-source.test.ts features/nooka/places-source.ts` (kể tên file, không truyền cả thư mục — Windows báo `Cannot find module`).

---

## Task 1: Google Places source — type + interface (TDD)

**Files:**
- Create: `nooka-mobile/features/nooka/places-source.ts`
- Create: `nooka-mobile/features/nooka/places-source.test.ts`

**Interfaces:**
- Produces: `export type GooglePlace = { placeId: string; name: string; vicinity: string; lat: number; lng: number; types: string[]; rating?: number; userRatingsTotal?: number; icon?: string; iconBackgroundColor?: string; openNow?: boolean }`
- Produces: `export interface SpotSource { nearby(center: Coordinate, opts: { radius: number }): Promise<{ places: GooglePlace[]; source: 'google' | 'empty' }> }`
- Produces: `export type Source = 'google' | 'empty'`

**Consumes:** `Coordinate` type từ `features/nooka/geo.ts` (đã có: `{ latitude: number; longitude: number }`).

- [ ] **Step 1: Write the failing test (types + EmptySource)**

Mở `nooka-mobile/features/nooka/places-source.ts` — file trống. Mở `nooka-mobile/features/nooka/places-source.test.ts` — viết:

```ts
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
```

Truyền đúng 2 file vào `node --test` (xem Global Constraints — Windows cần kể tên file ra).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd nooka-mobile && node --test features/nooka/places-source.test.ts features/nooka/places-source.ts`
Expected: FAIL với `Cannot find module './places-source.ts'` hoặc `EmptySource is not defined`.

- [ ] **Step 3: Implement minimal types + EmptySource**

Trong `nooka-mobile/features/nooka/places-source.ts`:

```ts
import type { Coordinate } from './geo.ts';

export type GooglePlace = {
  placeId: string;
  name: string;
  vicinity: string;
  lat: number;
  lng: number;
  types: string[];
  rating?: number;
  userRatingsTotal?: number;
  icon?: string;
  iconBackgroundColor?: string;
  openNow?: boolean;
};

export type Source = 'google' | 'empty';

export interface SpotSource {
  nearby(
    center: Coordinate,
    opts: { radius: number },
  ): Promise<{ places: GooglePlace[]; source: Source }>;
}

export class EmptySource implements SpotSource {
  async nearby(): Promise<{ places: GooglePlace[]; source: 'empty' }> {
    return { places: [], source: 'empty' };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd nooka-mobile && node --test features/nooka/places-source.test.ts features/nooka/places-source.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add nooka-mobile/features/nooka/places-source.ts nooka-mobile/features/nooka/places-source.test.ts
git commit -m "feat(places-source): add GooglePlace type and EmptySource"
```

---

## Task 2: GooglePlacesSource — URL + parse

**Files:**
- Modify: `nooka-mobile/features/nooka/places-source.ts`
- Modify: `nooka-mobile/features/nooka/places-source.test.ts`

**Interfaces:**
- Produces: `export class GooglePlacesSource implements SpotSource { constructor(apiKey: string) }`

**Consumes:** `fetch` global, `GooglePlace`, `EmptySource` (Task 1).

- [ ] **Step 1: Add failing test for URL + parse**

Append vào `nooka-mobile/features/nooka/places-source.test.ts`:

```ts
import { GooglePlacesSource } from './places-source.ts';

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
```

- [ ] **Step 2: Run test to verify new tests fail**

Run: `cd nooka-mobile && node --test features/nooka/places-source.test.ts features/nooka/places-source.ts`
Expected: 4 new tests FAIL với `GooglePlacesSource is not defined`.

- [ ] **Step 3: Implement GooglePlacesSource**

Append vào `nooka-mobile/features/nooka/places-source.ts`:

```ts
const NEARBY_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

export class GooglePlacesSource implements SpotSource {
  constructor(private apiKey: string) {}

  async nearby(
    center: Coordinate,
    opts: { radius: number },
  ): Promise<{ places: GooglePlace[]; source: 'google' }> {
    const url = new URL(NEARBY_URL);
    url.searchParams.set('location', `${center.latitude},${center.longitude}`);
    url.searchParams.set('radius', String(opts.radius));
    url.searchParams.set('key', this.apiKey);

    const response = await fetch(url.toString());
    const body = (await response.json()) as PlacesResponse;

    if (body.status === 'ZERO_RESULTS') return { places: [], source: 'google' };
    if (body.status !== 'OK') {
      throw new Error(body.error_message ?? `Google Places error: ${body.status}`);
    }

    const places: GooglePlace[] = body.results.map(parsePlace).filter((p): p is GooglePlace => p !== null);
    return { places, source: 'google' };
  }
}

type PlacesResponse = {
  status: string;
  error_message?: string;
  results?: RawPlace[];
};

type RawPlace = {
  place_id: string;
  name: string;
  vicinity?: string;
  geometry?: { location?: { lat: number; lng: number } };
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  icon?: string;
  icon_background_color?: string;
  opening_hours?: { open_now?: boolean };
};

function parsePlace(raw: RawPlace): GooglePlace | null {
  const lat = raw.geometry?.location?.lat;
  const lng = raw.geometry?.location?.lng;
  if (lat === undefined || lng === undefined || !raw.place_id || !raw.name) return null;
  return {
    placeId: raw.place_id,
    name: raw.name,
    vicinity: raw.vicinity ?? '',
    lat,
    lng,
    types: raw.types ?? [],
    ...(raw.rating !== undefined ? { rating: raw.rating } : {}),
    ...(raw.user_ratings_total !== undefined ? { userRatingsTotal: raw.user_ratings_total } : {}),
    ...(raw.icon ? { icon: raw.icon } : {}),
    ...(raw.icon_background_color ? { iconBackgroundColor: raw.icon_background_color } : {}),
    ...(raw.opening_hours?.open_now !== undefined ? { openNow: raw.opening_hours.open_now } : {}),
  };
}
```

- [ ] **Step 4: Run test to verify all pass**

Run: `cd nooka-mobile && node --test features/nooka/places-source.test.ts features/nooka/places-source.ts`
Expected: PASS, 6 tests (2 từ Task 1 + 4 mới).

- [ ] **Step 5: Commit**

```bash
git add nooka-mobile/features/nooka/places-source.ts nooka-mobile/features/nooka/places-source.test.ts
git commit -m "feat(places-source): add GooglePlacesSource with fetch + parse"
```

---

## Task 3: createSource factory — đọc key từ Constants

**Files:**
- Modify: `nooka-mobile/features/nooka/places-source.ts`
- Modify: `nooka-mobile/features/nooka/places-source.test.ts`

**Interfaces:**
- Produces: `export function createSource(): SpotSource` — fail-safe: thiếu key → `EmptySource` (không throw).

**Consumes:** `expo-constants` (đã có), `GooglePlacesSource`, `EmptySource` (Task 2).

- [ ] **Step 1: Failing test for createSource fallback**

Append:

```ts
import { createSource } from './places-source.ts';

test('createSource returns EmptySource when key missing', () => {
  const original = process.env.GOOGLE_PLACES_KEY;
  delete process.env.GOOGLE_PLACES_KEY;
  try {
    const source = createSource();
    assert.ok(source instanceof EmptySource);
  } finally {
    if (original !== undefined) process.env.GOOGLE_PLACES_KEY = original;
  }
});
```

(Ghi chú: `createSource` đọc qua `Constants.expoConfig.extra.GOOGLE_PLACES_KEY`; test chỉ verify fallback khi env rỗng — `expo-constants` trong môi trường `node --test` đọc `extra` rỗng, nên cả hai đường đều rỗng. Đây là test về hành vi an toàn, không phải test về nguồn đọc.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd nooka-mobile && node --test features/nooka/places-source.test.ts features/nooka/places-source.ts`
Expected: FAIL `createSource is not defined`.

- [ ] **Step 3: Implement createSource**

Add to `nooka-mobile/features/nooka/places-source.ts`:

```ts
import Constants from 'expo-constants';

export function createSource(): SpotSource {
  const key = process.env.GOOGLE_PLACES_KEY ?? Constants.expoConfig?.extra?.GOOGLE_PLACES_KEY;
  if (!key) return new EmptySource();
  return new GooglePlacesSource(key);
}
```

- [ ] **Step 4: Run test to pass**

Run: `cd nooka-mobile && node --test features/nooka/places-source.test.ts features/nooka/places-source.ts`
Expected: PASS 7 tests.

- [ ] **Step 5: Commit**

```bash
git add nooka-mobile/features/nooka/places-source.ts nooka-mobile/features/nooka/places-source.test.ts
git commit -m "feat(places-source): add createSource factory with EmptySource fallback"
```

---

## Task 4: useNearbyPlaces hook — state + cache

**Files:**
- Create: `nooka-mobile/features/nooka/use-nearby-places.ts`
- Create: `nooka-mobile/features/nooka/use-nearby-places.test.ts`

**Interfaces:**
- Produces: `export function useNearbyPlaces(center: Coordinate, radius: number): { places: GooglePlace[]; loading: boolean; error: Error | null; source: Source }`
- Cache: `Map<string, { ts: number; data: { places: GooglePlace[]; source: Source } }>`, TTL 5 phút, key `${lat.toFixed(4)},${lng.toFixed(4)},${radius}`.

**Consumes:** `createSource()` (Task 3), `Coordinate` (geo.ts), `GooglePlace`, `Source` (places-source.ts).

- [ ] **Step 1: Failing test for cache hit**

`nooka-mobile/features/nooka/use-nearby-places.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchNearby } from './use-nearby-places.ts';

test('fetchNearby dedupes concurrent calls with same key', async () => {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    calls.push(url);
    await new Promise((r) => setTimeout(r, 10));
    return new Response(JSON.stringify({ status: 'OK', results: [] }), {
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  try {
    const center = { latitude: 10.8014, longitude: 106.7109 };
    const [a, b] = await Promise.all([
      fetchNearby(center, { radius: 2000 }),
      fetchNearby(center, { radius: 2000 }),
    ]);
    assert.equal(calls.length, 1);
    assert.equal(a.places.length, 0);
    assert.equal(b.places.length, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test('fetchNearby returns cached result within TTL', async () => {
  const calls: string[] = [];
  const original = globalThis.fetch;
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
    )) as typeof fetch;
  try {
    const center = { latitude: 10.8014, longitude: 106.7109 };
    const a = await fetchNearby(center, { radius: 2000 });
    const b = await fetchNearby(center, { radius: 2000 });
    assert.equal(calls.length, 1);
    assert.equal(a.places[0].name, 'Cafe');
    assert.equal(b.places[0].name, 'Cafe');
  } finally {
    globalThis.fetch = original;
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd nooka-mobile && node --test features/nooka/use-nearby-places.test.ts features/nooka/use-nearby-places.ts`
Expected: FAIL `fetchNearby is not defined`.

- [ ] **Step 3: Implement core fetchNearby + cache**

Create `nooka-mobile/features/nooka/use-nearby-places.ts`:

```ts
import { useEffect, useState } from 'react';

import { createSource, type GooglePlace, type Source } from './places-source.ts';
import type { Coordinate } from './geo.ts';

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { ts: number; data: { places: GooglePlace[]; source: Source } }>();
const inflight = new Map<string, Promise<{ places: GooglePlace[]; source: Source }>>();

type Options = { radius: number };

export async function fetchNearby(
  center: Coordinate,
  opts: Options,
): Promise<{ places: GooglePlace[]; source: Source }> {
  const key = `${center.latitude.toFixed(4)},${center.longitude.toFixed(4)},${opts.radius}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = createSource()
    .nearby(center, opts)
    .then((data) => {
      cache.set(key, { ts: Date.now(), data });
      inflight.delete(key);
      return data;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });
  inflight.set(key, promise);
  return promise;
}

export type NearbyState = {
  places: GooglePlace[];
  loading: boolean;
  error: Error | null;
  source: Source;
};

export function useNearbyPlaces(center: Coordinate, radius: number): NearbyState {
  const [state, setState] = useState<NearbyState>({
    places: [],
    loading: true,
    error: null,
    source: 'empty',
  });

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));
    fetchNearby(center, { radius })
      .then((data) => {
        if (!cancelled) setState({ places: data.places, loading: false, error: null, source: data.source });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ places: [], loading: false, error: err, source: 'empty' });
      });
    return () => {
      cancelled = true;
    };
  }, [center.latitude, center.longitude, radius]);

  return state;
}
```

- [ ] **Step 4: Run test to pass**

Run: `cd nooka-mobile && node --test features/nooka/use-nearby-places.test.ts features/nooka/use-nearby-places.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add nooka-mobile/features/nooka/use-nearby-places.ts nooka-mobile/features/nooka/use-nearby-places.test.ts
git commit -m "feat(places): add useNearbyPlaces hook with TTL cache"
```

---

## Task 5: app.config.js — đọc GOOGLE_PLACES_KEY

**Files:**
- Modify: `nooka-mobile/app.config.js`

**Consumes:** `process.env.GOOGLE_PLACES_KEY` (đặt qua EAS secret hoặc `.env.local`).

- [ ] **Step 1: Modify app.config.js**

```js
/**
 * Config động chồng lên `app.json`.
 *
 * Lý do tồn tại: API key của Google Maps **không được commit** (luật "Không
 * commit" trong `AGENTS.md`), mà `app.json` là JSON tĩnh nên không đọc được
 * biến môi trường. File này đọc từ env và chỉ thêm plugin khi có key.
 *
 * Dev bằng Expo Go thì không cần key — Expo Go đã có sẵn Google Maps SDK.
 * Key chỉ cần khi build độc lập:
 *
 *   EAS:   eas secret:create --name GOOGLE_MAPS_ANDROID_KEY --value <key>
 *   Máy:   đặt trong `.env.local` (đã nằm trong .gitignore)
 *
 * `GOOGLE_PLACES_KEY` cũng đi qua file này: tiêm vào `extra` để
 * `Constants.expoConfig.extra.GOOGLE_PLACES_KEY` trả về giá trị lúc
 * runtime. Thiếu key → `createSource()` trả `EmptySource` (xem
 * `features/nooka/places-source.ts`) và tab Tìm vẫn mở được.
 */
module.exports = ({ config }) => {
  const androidKey = process.env.GOOGLE_MAPS_ANDROID_KEY;
  const iosKey = process.env.GOOGLE_MAPS_IOS_KEY;
  const placesKey = process.env.GOOGLE_PLACES_KEY;

  const plugins = config.plugins ?? [];
  if (androidKey || iosKey) {
    plugins.push([
      'react-native-maps',
      {
        ...(androidKey ? { androidGoogleMapsApiKey: androidKey } : {}),
        ...(iosKey ? { iosGoogleMapsApiKey: iosKey } : {}),
      },
    ]);
  }

  const extra = { ...(config.extra ?? {}), ...(placesKey ? { GOOGLE_PLACES_KEY: placesKey } : {}) };

  return {
    ...config,
    plugins,
    extra,
  };
};
```

- [ ] **Step 2: Verify tsc passes**

Run: `cd nooka-mobile && npx tsc --noEmit`
Expected: PASS (không có lỗi mới).

- [ ] **Step 3: Commit**

```bash
git add nooka-mobile/app.config.js
git commit -m "feat(app-config): expose GOOGLE_PLACES_KEY via extra"
```

---

## Task 6: Component GooglePin — pin số cluster

**Files:**
- Create: `nooka-mobile/components/nooka/google-pin.tsx`

**Consumes:** `useNookaTheme()` (đã có ở `hooks/use-nooka-theme.ts`), `t()` từ `lib/i18n.ts`.

- [ ] **Step 1: Implement GooglePin**

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

type Props = {
  count: number;
  onPress: () => void;
};

/**
 * Pin Google — chỉ hiện số quán trong viewport. Click để focus vào cluster.
 *
 * Chỉ là một pin duy nhất ở giữa, KHÔNG scale lên thành "mỗi quán một pin":
 * AGENTS.md cảnh báo overlay re-render toàn bộ khi region đổi, và ghim
 * chồng lên nhau khi quán dày đặc. 60 quán × 60 view = bài toán drag.
 */
export function GooglePin({ count, onPress }: Props) {
  const { colors } = useNookaTheme();

  if (count === 0) return null;

  return (
    <Pressable
      accessibilityLabel={t('map.googlePin', { count })}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, { opacity: pressed ? 0.85 : 1 }]}>
      <View
        style={[
          styles.pill,
          { backgroundColor: colors.inverseSurface, borderColor: colors.accent },
        ]}>
        <View style={[styles.dot, { backgroundColor: colors.accent }]} />
        <Text style={[styles.count, { color: colors.onInverse }]}>{String(count)}</Text>
      </View>
      <View
        style={[styles.stem, { backgroundColor: colors.inverseSurface }]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  count: { fontSize: 12, fontWeight: '700' },
  stem: { width: 2, height: 9 },
});
```

- [ ] **Step 2: Add i18n keys**

`nooka-mobile/locales/en.json` — tìm phần `map`, thêm:

```json
"googlePin": "Google Places nearby",
"googleError": "Google Places unavailable",
"googleLoading": "Finding places nearby",
"googleEmpty": "No places found"
```

`nooka-mobile/locales/vi.json` — same keys:

```json
"googlePin": "Quán Google quanh đây",
"googleError": "Không tải được Google Places",
"googleLoading": "Đang tìm quán quanh đây",
"googleEmpty": "Không có quán nào"
```

(Đặt key trong object `map` đã có. Vị trí không quan trọng — JSON.)

- [ ] **Step 3: Verify tsc passes**

Run: `cd nooka-mobile && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add nooka-mobile/components/nooka/google-pin.tsx nooka-mobile/locales/en.json nooka-mobile/locales/vi.json
git commit -m "feat(map): add GooglePin cluster component + i18n keys"
```

---

## Task 7: NookaMap — thêm prop `pins`

**Files:**
- Modify: `nooka-mobile/components/nooka/nooka-map.tsx`

**Consumes:** `GooglePin` (Task 6), `GooglePlace` (Task 1).

- [ ] **Step 1: Add prop types + render**

Trong `nooka-map.tsx`, sửa:

1. Sau `import { SPOTS, ... }`, thêm:

```ts
import type { GooglePlace } from '@/features/nooka/places-source';
import { GooglePin } from '@/components/nooka/google-pin';
```

2. Sau `type NookaMapProps`, thêm type:

```ts
export type GooglePlacePin = {
  placeId: string;
  coordinate: Coordinate;
  name: string;
};
```

3. Sửa `NookaMapProps` thêm:

```ts
pins?: GooglePlace[];
```

4. Destructure `pins = []` trong function signature.

5. Trong `useImperativeHandle`, thêm method:

```ts
focusPin(id: string) {
  const pin = pins?.find((p) => p.placeId === id);
  if (!pin) return;
  mapRef.current?.animateToRegion(regionAround(pin.coordinate, 0.005), 350);
},
```

6. Trong JSX, sau `<UserDot ... />` và trước `{spots.map(...)}`, thêm:

```tsx
{pins.length > 0 ? (
  <GooglePin
    count={pins.length}
    onPress={() => {
      const coords = pins.map((p) => p.coordinate);
      const region = regionFor(coords);
      if (region) mapRef.current?.animateToRegion(region, 350);
    }}
  />
) : null}
```

- [ ] **Step 2: Verify tsc passes**

Run: `cd nooka-mobile && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add nooka-mobile/components/nooka/nooka-map.tsx
git commit -m "feat(map): add pins prop for Google Places cluster"
```

---

## Task 8: search.tsx — gọi useNearbyPlaces, render pin + sheet

**Files:**
- Modify: `nooka-mobile/app/(tabs)/search.tsx`

**Consumes:** `useNearbyPlaces` (Task 4), `NookaMap` (Task 7), `GooglePlace` (Task 1).

- [ ] **Step 1: Modify imports**

Thêm `import { useNearbyPlaces } from '@/features/nooka/use-nearby-places';` sau existing imports.

- [ ] **Step 2: Gọi hook**

Trong `SearchTabScreen`, ngay sau `const demo = useNookaDemo();`, thêm:

```ts
const nearby = useNearbyPlaces(USER_LOCATION, 2000);
```

Thêm `USER_LOCATION` vào import từ `@/features/nooka/spots`:

```ts
import { SPOTS, ..., USER_LOCATION, type SpotId, type TagId } from '@/features/nooka/spots';
```

- [ ] **Step 3: Sửa ResultRow rendering khi có nearby.places**

Thay block:

```tsx
{results.length === 0 ? (
  <Text style={[styles.empty, { color: colors.textMuted }]}>{t('search.empty')}</Text>
) : (
  results.map((id) => (
    <ResultRow
      ...
    />
  ))
)}
```

Bằng:

```tsx
{(() => {
  if (nearby.loading) {
    return <Text style={[styles.empty, { color: colors.textMuted }]}>{t('map.googleLoading')}</Text>;
  }
  if (nearby.error) {
    return <Text style={[styles.empty, { color: colors.textMuted }]}>{t('map.googleError')}</Text>;
  }
  if (nearby.places.length === 0) {
    return <Text style={[styles.empty, { color: colors.textMuted }]}>{t('map.googleEmpty')}</Text>;
  }
  return nearby.places.map((place) => (
    <ResultRow
      badge={place.openNow ? t('map.openNow') : undefined}
      key={place.placeId}
      reason={place.vicinity}
      tags={place.types.slice(0, 2).join(' · ')}
      title={place.name}
      tint="photoSand"
    />
  );
})()}
```

Thêm key `map.openNow` vào 2 locale:

`en.json`:
```json
"openNow": "Open now"
```

`vi.json`:
```json
"openNow": "Đang mở"
```

- [ ] **Step 4: Truyền pins vào NookaMap**

Sửa `<NookaMap ... />`:

```tsx
<NookaMap
  mapPadding={{ top: insets.top + 110, bottom: snapHeights[snapIndex] }}
  onPressMap={() => setSelected(null)}
  onSelectSpot={pickSpot}
  pins={nearby.places}
  ref={mapRef}
  selectedSpot={selected}
  spots={results}
  style={StyleSheet.absoluteFill}
/>
```

- [ ] **Step 5: Verify lint + tsc**

Run: `cd nooka-mobile && npm run lint && npx tsc --noEmit`
Expected: cả hai PASS.

- [ ] **Step 6: Commit**

```bash
git add nooka-mobile/app/(tabs)/search.tsx nooka-mobile/locales/en.json nooka-mobile/locales/vi.json
git commit -m "feat(search): render Google Places via useNearbyPlaces"
```

---

## Task 9: Final verification

**Files:** none.

- [ ] **Step 1: Run all three commands**

Run:

```bash
cd nooka-mobile && npm run lint
cd nooka-mobile && npx tsc --noEmit
cd nooka-mobile && npx expo-doctor
```

Expected: tất cả sạch. `expo-doctor` có thể warn về env missing — đó là OK vì `GOOGLE_PLACES_KEY` chưa được đặt trong máy dev.

- [ ] **Step 2: Run all unit tests**

Run: `cd nooka-mobile && node --test features/nooka/places-source.test.ts features/nooka/places-source.ts features/nooka/use-nearby-places.test.ts features/nooka/use-nearby-places.ts features/nooka/ranking.test.ts features/nooka/geo.test.ts`

Expected: PASS toàn bộ. (Thêm 2 file test cũ để chắc không break gì.)

- [ ] **Step 3: git status sạch**

Run: `git status --short`

Expected: chỉ thấy các file đã commit ở các task trước. Nếu còn file modified/untracked, check lại step trước đó.

- [ ] **Step 4: Báo cáo cho reviewer**

Tóm tắt thay đổi:
- 4 file mới: `places-source.ts`, `places-source.test.ts`, `use-nearby-places.ts`, `use-nearby-places.test.ts`, `google-pin.tsx`.
- 3 file sửa: `app.config.js`, `nooka-map.tsx`, `search.tsx`, `locales/en.json`, `locales/vi.json`.
- 0 dependency mới.
- 4 chỗ giả + check-in flow + feed + saved + profile không bị đụng.

---

## Self-review

**1. Spec coverage:**
- "Google Places chỉ ở tab Tìm" → Task 8 (sửa search.tsx).
- "Không thêm dependency" → không thấy trong plan — verify.
- "Không viết tay DTO" → Task 1 build type dựa trên Google doc (đã fetch Task 0 in spec), Task 2 test verify.
- "In-memory cache TTL 5 phút" → Task 4.
- "USER_LOCATION hằng số" → Task 8 dùng `USER_LOCATION` từ spots.ts (const).
- "API key qua env/EAS" → Task 5.
- "Thiếu key → EmptySource" → Task 3.
- "Pin Google là 1 pin số cluster" → Task 6 + Task 7.
- "Không đụng SpotId literal" → plan không sửa `spots.ts`. ✓
- "Test bằng node --test, kể tên file" → Global Constraints + mỗi task. ✓
- "Lint + tsc + expo-doctor sạch" → Task 9. ✓

**2. Placeholder scan:**
- "TODO"/"TBD"/"implement later" → không có.
- "Add appropriate error handling" → Task 2 test 4 cụ thể.
- "Similar to Task N" → mỗi task có code riêng.
- Type names consistent: `GooglePlace`, `SpotSource`, `Source`, `EmptySource`, `GooglePlacesSource`, `createSource`, `useNearbyPlaces`, `fetchNearby`, `GooglePin`, `GooglePlacePin` — đều dùng nhất quán.

**3. Type consistency:**
- `Coordinate` từ `geo.ts` — Task 1 + Task 4 dùng đúng.
- `EmptySource` class Task 1, được dùng lại Task 3.
- `createSource()` trả `SpotSource` — Task 3 + Task 4 đều dùng đúng.
- `NookaMap` prop `pins: GooglePlace[]` (Task 7) — Task 8 truyền `nearby.places` (cùng type). ✓
