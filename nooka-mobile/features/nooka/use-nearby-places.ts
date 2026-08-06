import { useEffect, useMemo, useState } from 'react';

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
  const queryCenter = useMemo(
    () => ({
      latitude: Number(center.latitude.toFixed(3)),
      longitude: Number(center.longitude.toFixed(3)),
    }),
    [center.latitude, center.longitude],
  );
  const [state, setState] = useState<NearbyState>({
    places: [],
    loading: true,
    error: null,
    source: 'empty',
  });

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));
    fetchNearby(queryCenter, { radius })
      .then((data) => {
        if (!cancelled) setState({ places: data.places, loading: false, error: null, source: data.source });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ places: [], loading: false, error: err, source: 'empty' });
      });
    return () => {
      cancelled = true;
    };
  }, [queryCenter, radius]);

  return state;
}
