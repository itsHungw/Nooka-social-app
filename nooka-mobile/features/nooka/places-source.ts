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

/**
 * Fallback `SpotSource` trả về danh sách rỗng.
 *
 * Dùng khi thiếu API key, khi gọi Google Places thất bại, hoặc khi muốn tắt
 * nguồn ngoài để chỉ hiển thị 4 spot hardcoded ở `spots.ts`. Không ném lỗi —
 * giao diện vẫn render được, chỉ là không có ghim từ Google.
 */
export class EmptySource implements SpotSource {
  async nearby(
    _center: Coordinate,
    _opts: { radius: number },
  ): Promise<{ places: GooglePlace[]; source: 'empty' }> {
    return { places: [], source: 'empty' };
  }
}

const NEARBY_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

export class GooglePlacesSource implements SpotSource {
  private apiKey: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async nearby(
    _center: Coordinate,
    _opts: { radius: number },
  ): Promise<{ places: GooglePlace[]; source: 'google' }> {
    const url = new URL(NEARBY_URL);
    url.searchParams.set('location', `${_center.latitude},${_center.longitude}`);
    url.searchParams.set('radius', String(_opts.radius));
    url.searchParams.set('key', this.apiKey);

    const response = await fetch(url.toString());
    const body = (await response.json()) as PlacesResponse;

    if (body.status === 'ZERO_RESULTS') return { places: [], source: 'google' };
    if (body.status !== 'OK') {
      throw new Error(body.error_message ?? `Google Places error: ${body.status}`);
    }

    const places: GooglePlace[] = (body.results ?? [])
      .map(parsePlace)
      .filter((p): p is GooglePlace => p !== null);
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

export function createSource(): SpotSource {
  const fromEnv = process.env.GOOGLE_PLACES_KEY;
  if (fromEnv) return new GooglePlacesSource(fromEnv);
  // Lazy require — expo-constants is React Native only and breaks
  // node --test under strip-only TS. In RN runtime, this loads the real module.
  try {
    // Runtime-only import; strip-only TS in node --test would fail to parse
    // a top-level `import Constants from 'expo-constants'`.
    const Constants = require('expo-constants').default ?? require('expo-constants');
    const key: string | undefined = Constants?.expoConfig?.extra?.GOOGLE_PLACES_KEY;
    if (key) return new GooglePlacesSource(key);
  } catch {
    // expo-constants not available (web, node test) — fall through.
  }
  return new EmptySource();
}