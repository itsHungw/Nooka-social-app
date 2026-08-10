import type { Coordinate } from './geo.ts';

export type TravelMode = 'DRIVE' | 'WALK';

export type RoutePreview = {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
  mode: TravelMode;
};

type RoutePreviewRequest = {
  origin: Coordinate;
  destination: Coordinate;
  mode: TravelMode;
};

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

export async function fetchRoutePreview(request: RoutePreviewRequest): Promise<RoutePreview> {
  const response = await fetch(`${API_BASE_URL}/v1/directions/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Route preview failed with status ${response.status}`);
  }

  return (await response.json()) as RoutePreview;
}

export function externalDirectionsUrl(
  destination: Coordinate,
  mode: TravelMode,
  platform: 'ios' | 'android' | 'web',
): string {
  const encodedDestination = encodeURIComponent(`${destination.latitude},${destination.longitude}`);
  const travelMode = mode === 'WALK' ? 'walking' : 'driving';

  if (platform === 'ios') {
    return `http://maps.apple.com/?daddr=${encodedDestination}&dirflg=${mode === 'WALK' ? 'w' : 'd'}`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=${travelMode}`;
}
