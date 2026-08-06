import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { Chip } from '@/components/nooka/ui';
import { decodePolyline, regionFor, type Coordinate } from '@/features/nooka/geo';
import type { RoutePreview, TravelMode } from '@/features/nooka/directions-api';
import { nookaMapStyle } from '@/features/nooka/map-style';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

type DirectionPreviewProps = {
  destination: Coordinate;
  loading: boolean;
  mode: TravelMode;
  onModeChange: (mode: TravelMode) => void;
  onOpenMaps: () => void;
  origin: Coordinate | null;
  route: RoutePreview | null;
  error: string | null;
};

export function DirectionPreview({
  destination,
  loading,
  mode,
  onModeChange,
  onOpenMaps,
  origin,
  route,
  error,
}: DirectionPreviewProps) {
  const { colors, colorScheme } = useNookaTheme();
  const mapRef = useRef<MapView>(null);
  const routeCoordinates = useMemo(
    () => (route ? decodePolyline(route.encodedPolyline) : []),
    [route],
  );
  const mapCoordinates = useMemo(
    () => (origin ? [origin, destination, ...routeCoordinates] : [destination, ...routeCoordinates]),
    [destination, origin, routeCoordinates],
  );
  const region = useMemo(() => regionFor(mapCoordinates, { padding: 0.2, minDelta: 0.008 }), [mapCoordinates]);

  useEffect(() => {
    if (mapCoordinates.length > 1) {
      mapRef.current?.fitToCoordinates(mapCoordinates, {
        animated: false,
        edgePadding: { top: 32, right: 32, bottom: 32, left: 32 },
      });
    }
  }, [mapCoordinates]);

  const distance = route ? formatRouteDistance(route.distanceMeters) : null;
  const duration = route ? formatRouteDuration(route.durationSeconds) : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
      <View style={styles.header}>
        <View style={styles.headingCopy}>
          <Text style={[styles.eyebrow, { color: colors.textMuted }]}>{t('spot.routePreview')}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t('spot.routeFromCurrent')}</Text>
        </View>
        <Ionicons color={colors.accentInk} name="navigate" size={21} />
      </View>

      <View style={styles.modeRail}>
        <Chip
          label={t('spot.drive')}
          onPress={() => onModeChange('DRIVE')}
          selected={mode === 'DRIVE'}
        />
        <Chip
          label={t('spot.walk')}
          onPress={() => onModeChange('WALK')}
          selected={mode === 'WALK'}
        />
      </View>

      <View style={styles.mapWrap}>
        <MapView
          customMapStyle={nookaMapStyle(colors)}
          initialRegion={region ?? undefined}
          key={colorScheme}
          pitchEnabled={false}
          provider={PROVIDER_GOOGLE}
          ref={mapRef}
          rotateEnabled={false}
          showsCompass={false}
          showsMyLocationButton={false}
          showsUserLocation={false}
          style={StyleSheet.absoluteFill}
          toolbarEnabled={false}>
          {routeCoordinates.length > 1 ? (
            <Polyline coordinates={routeCoordinates} strokeColor={colors.accentInk} strokeWidth={5} />
          ) : null}
          {origin ? <Marker coordinate={origin} pinColor={colors.locationDot} /> : null}
          <Marker coordinate={destination} pinColor={colors.accent} />
        </MapView>
        {loading ? (
          <View style={[styles.mapStatus, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statusText, { color: colors.textMuted }]}>{t('spot.routeLoading')}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={[styles.mapStatus, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statusText, { color: colors.textMuted }]}>{error}</Text>
          </View>
        ) : null}
      </View>

      {route ? (
        <View style={styles.summary}>
          <View>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{distance}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('spot.routeDistance')}</Text>
          </View>
          <View>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{duration}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('spot.routeEta')}</Text>
          </View>
        </View>
      ) : null}

      <Chip floating label={t('spot.openInMaps')} onPress={onOpenMaps} selected />
    </View>
  );
}

function formatRouteDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function formatRouteDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

const styles = StyleSheet.create({
  card: { marginTop: 20, borderRadius: 20, borderWidth: 1, padding: 14, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headingCopy: { gap: 2 },
  eyebrow: { fontSize: 11, lineHeight: 15, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  modeRail: { flexDirection: 'row', gap: 8 },
  mapWrap: { height: 190, overflow: 'hidden', borderRadius: 16 },
  mapStatus: { position: 'absolute', left: 12, right: 12, bottom: 12, borderRadius: 10, padding: 9 },
  statusText: { fontSize: 12, lineHeight: 16, fontWeight: '600', textAlign: 'center' },
  summary: { flexDirection: 'row', gap: 28 },
  summaryValue: { fontSize: 18, lineHeight: 23, fontWeight: '800' },
  summaryLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
});
