import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

import { type Coordinate } from './geo.ts';
import { USER_LOCATION } from './spots.ts';

export type UserLocationState = {
  coordinate: Coordinate;
  error: Error | null;
  isLive: boolean;
  loading: boolean;
  permission: 'denied' | 'granted' | 'undetermined';
};

function toCoordinate(location: Location.LocationObject): Coordinate {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

const fallbackState: UserLocationState = {
  coordinate: USER_LOCATION,
  error: null,
  isLive: false,
  loading: true,
  permission: 'undetermined',
};

export async function getForegroundLocation(): Promise<Coordinate> {
  if (Platform.OS === 'web') throw new Error('Location is available on native devices only');

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new Error('Location permission was denied');
  }

  return toCoordinate(
    await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
  );
}

/**
 * Tracks device location only while the owning screen is mounted and in the
 * foreground. No background task is registered and no coordinate leaves the app.
 */
export function useUserLocation(): UserLocationState {
  const [state, setState] = useState<UserLocationState>(fallbackState);

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    async function start() {
      if (Platform.OS === 'web') {
        setState((current) => ({ ...current, loading: false }));
        return;
      }

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        if (permission.status !== Location.PermissionStatus.GRANTED) {
          setState({
            coordinate: USER_LOCATION,
            error: null,
            isLive: false,
            loading: false,
            permission: 'denied',
          });
          return;
        }

        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;

        setState({
          coordinate: toCoordinate(current),
          error: null,
          isLive: true,
          loading: false,
          permission: 'granted',
        });

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 5,
            timeInterval: 1000,
          },
          (next) => {
            if (cancelled) return;
            setState((previous) => ({
              ...previous,
              coordinate: toCoordinate(next),
              error: null,
              isLive: true,
              loading: false,
              permission: 'granted',
            }));
          },
        );

        if (cancelled) subscription.remove();
      } catch (error) {
        if (cancelled) return;
        setState({
          coordinate: USER_LOCATION,
          error: error instanceof Error ? error : new Error('Unable to read location'),
          isLive: false,
          loading: false,
          permission: 'granted',
        });
      }
    }

    void start();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return state;
}
