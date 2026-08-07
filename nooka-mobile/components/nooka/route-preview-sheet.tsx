import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NookaSheet } from '@/components/nooka/bottom-sheet';
import { Button } from '@/components/nooka/ui';
import { decodePolyline, regionAround, regionFor, type Coordinate } from '@/features/nooka/geo';
import type { RoutePreview, TravelMode } from '@/features/nooka/directions-api';
import { nookaMapStyle } from '@/features/nooka/map-style';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

const COMPACT_RATIO = 0.32;
const EXPANDED_RATIO = 0.85;

type RoutePreviewSheetProps = {
  visible: boolean;
  spotName: string;
  destination: Coordinate;
  origin: Coordinate | null;
  route: RoutePreview | null;
  loading: boolean;
  error: string | null;
  mode: TravelMode;
  onClose: () => void;
  onModeChange: (mode: TravelMode) => void;
  onRetry: () => void;
  onOpenMaps: () => void;
};

export function RoutePreviewSheet({
  visible,
  spotName,
  destination,
  origin,
  route,
  loading,
  error,
  mode,
  onClose,
  onModeChange,
  onRetry,
  onOpenMaps,
}: RoutePreviewSheetProps) {
  const { colors, colorScheme } = useNookaTheme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [sheetIndex, setSheetIndex] = useState(0);

  const viewportHeight = Math.max(480, windowHeight - insets.top - insets.bottom);
  const snapHeights = useMemo<readonly number[]>(() => {
    const compact = Math.round(viewportHeight * COMPACT_RATIO);
    const expanded = Math.round(viewportHeight * EXPANDED_RATIO);
    return [Math.max(228, compact), Math.max(compact + 1, expanded)];
  }, [viewportHeight]);
  const compactHeight = snapHeights[0];

  useEffect(() => {
    if (visible) setSheetIndex(0);
  }, [visible]);

  const routeCoordinates = useMemo(() => {
    if (!route?.encodedPolyline.trim()) return [];
    return decodePolyline(route.encodedPolyline);
  }, [route]);

  const mapCoordinates = useMemo(
    () => (origin ? [origin, destination, ...routeCoordinates] : [destination, ...routeCoordinates]),
    [destination, origin, routeCoordinates],
  );

  const initialRegion = useMemo(
    () => regionFor(mapCoordinates, { padding: 0.22, minDelta: 0.005 }) ?? regionAround(destination),
    [destination, mapCoordinates],
  );

  const mapStyle = useMemo(() => nookaMapStyle(colors), [colors]);

  const fitMap = useCallback(() => {
    if (mapCoordinates.length > 1) {
      mapRef.current?.fitToCoordinates(mapCoordinates, {
        animated: true,
        edgePadding: {
          top: insets.top + 32,
          right: 28,
          bottom: compactHeight + 34,
          left: 28,
        },
      });
      return;
    }

    mapRef.current?.animateToRegion(initialRegion, 350);
  }, [compactHeight, insets.top, initialRegion, mapCoordinates]);

  useEffect(() => {
    if (visible) fitMap();
  }, [fitMap, visible]);

  const distance = route ? formatDistance(route.distanceMeters) : null;
  const eta = route ? formatDuration(route.durationSeconds) : null;
  const isExpanded = sheetIndex === snapHeights.length - 1;

  if (!visible) return null;

  return (
    <>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <MapView
          customMapStyle={mapStyle}
          initialRegion={initialRegion}
          key={`route-map-${colorScheme}-${routeCoordinates.length}`}
          onMapReady={fitMap}
          onLayout={fitMap}
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
            <Polyline
              coordinates={routeCoordinates}
              key={`route-casing-${route?.encodedPolyline ?? 'empty'}`}
              strokeColor={colors.inverseSurface}
              strokeWidth={10}
              zIndex={100}
            />
          ) : null}
          {routeCoordinates.length > 1 ? (
            <Polyline
              coordinates={routeCoordinates}
              key={`route-line-${route?.encodedPolyline ?? 'empty'}`}
              strokeColor={colors.accent}
              strokeWidth={6}
              zIndex={101}
            />
          ) : null}
          {origin ? (
            <Marker
              coordinate={origin}
              pinColor={colors.locationDot}
              title={t('spot.routeFromCurrent')}
            />
          ) : null}
          <Marker coordinate={destination} pinColor={colors.accentStrong} title={spotName} />
        </MapView>
      </View>

      <NookaSheet
        header={
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text numberOfLines={1} style={[styles.spotName, { color: colors.text }]}>
                {spotName}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {t('spot.routePreview')}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t('common.close')}
              accessibilityRole="button"
              hitSlop={6}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: colors.surfaceMuted,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <Ionicons color={colors.text} name="close" size={20} />
            </Pressable>
          </View>
        }
        index={sheetIndex}
        onIndexChange={setSheetIndex}
        snapHeights={snapHeights}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}>
          <View
            accessibilityLabel={t('spot.routePreview')}
            accessibilityRole="tablist"
            style={[styles.modeControl, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderSubtle }]}>
            <ModeButton
              active={mode === 'DRIVE'}
              icon="car-sport-outline"
              label={t('spot.drive')}
              onPress={() => {
                if (mode !== 'DRIVE') onModeChange('DRIVE');
              }}
              colors={colors}
            />
            <ModeButton
              active={mode === 'WALK'}
              icon="walk-outline"
              label={t('spot.walk')}
              onPress={() => {
                if (mode !== 'WALK') onModeChange('WALK');
              }}
              colors={colors}
            />
          </View>

          {loading ? (
            <View style={[styles.statusCard, { backgroundColor: colors.surfaceMuted }]}>
              <ActivityIndicator color={colors.accentStrong} />
              <Text style={[styles.statusText, { color: colors.textMuted }]}>
                {t('spot.routeLoading')}
              </Text>
            </View>
          ) : null}

          {error ? (
            <View
              accessibilityLiveRegion="polite"
              style={[styles.errorCard, { backgroundColor: colors.accentSoft, borderColor: colors.borderSubtle }]}>
              <View style={styles.errorIcon}>
                <Ionicons color={colors.accentInk} name="alert-circle-outline" size={20} />
              </View>
              <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
              <Button label={t('common.retry')} onPress={onRetry} style={styles.fullWidthButton} tone="outline" />
            </View>
          ) : null}

          {route && !loading ? (
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={styles.summaryHeading}>
                <View style={[styles.routeIcon, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons color={colors.accentInk} name="navigate-outline" size={18} />
                </View>
                <View style={styles.summaryHeadingCopy}>
                  <Text style={[styles.summaryTitle, { color: colors.text }]}>
                    {t('spot.routePreview')}
                  </Text>
                  <Text style={[styles.summarySubtitle, { color: colors.textMuted }]}>
                    {t('spot.routeFromCurrent')}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <Metric icon="swap-horizontal-outline" label={t('spot.routeDistance')} value={distance ?? '—'} colors={colors} />
                <Metric icon="time-outline" label={t('spot.routeEta')} value={eta ?? '—'} colors={colors} />
              </View>
            </View>
          ) : null}

          {isExpanded && route && !loading ? (
            <View style={[styles.detailsCard, { backgroundColor: colors.surfaceMuted }]}>
              <Text style={[styles.detailsTitle, { color: colors.text }]}>
                {t('spot.viewRouteDetails')}
              </Text>
              <View style={styles.detailRow}>
                <Ionicons color={colors.textMuted} name="information-circle-outline" size={18} />
                <Text style={[styles.note, { color: colors.textMuted }]}>
                  {t('spot.normalConditions')}
                </Text>
              </View>
              <Button label={t('spot.openInMaps')} onPress={onOpenMaps} style={styles.fullWidthButton} tone="outline" />
            </View>
          ) : null}

          {!isExpanded && route && !loading ? (
            <Button
              label={t('spot.viewRouteDetails')}
              onPress={() => setSheetIndex(snapHeights.length - 1)}
              style={styles.primaryButton}
              tone="accent"
            />
          ) : null}
        </ScrollView>
      </NookaSheet>
    </>
  );
}

function ModeButton({
  active,
  colors,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  colors: ReturnType<typeof useNookaTheme>['colors'];
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeButton,
        {
          backgroundColor: active ? colors.surface : 'transparent',
          opacity: pressed ? 0.76 : 1,
          shadowColor: colors.shadow,
        },
        active ? styles.modeButtonSelected : null,
      ]}>
      <Ionicons color={active ? colors.text : colors.textMuted} name={icon} size={18} />
      <Text style={[styles.modeLabel, { color: active ? colors.text : colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

function Metric({
  colors,
  icon,
  label,
  value,
}: {
  colors: ReturnType<typeof useNookaTheme>['colors'];
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricLabel}>
        <Ionicons color={colors.textMuted} name={icon} size={15} />
        <Text style={[styles.metricCaption, { color: colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerCopy: { flex: 1, gap: 2, minWidth: 0 },
  spotName: { fontSize: 18, fontWeight: '800', letterSpacing: -0.45, lineHeight: 24 },
  subtitle: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  closeButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  content: { gap: 14, paddingHorizontal: 20, paddingTop: 4 },
  modeControl: { borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 4, padding: 3 },
  modeButton: {
    alignItems: 'center',
    borderRadius: 13,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  modeButtonSelected: {
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 2,
  },
  modeLabel: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  statusCard: {
    alignItems: 'center',
    borderRadius: 18,
    gap: 10,
    justifyContent: 'center',
    minHeight: 108,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  statusText: { fontSize: 14, fontWeight: '600', lineHeight: 20, textAlign: 'center' },
  errorCard: { borderRadius: 18, borderWidth: 1, gap: 10, padding: 16 },
  errorIcon: { alignItems: 'center', height: 24, justifyContent: 'center', width: 24 },
  errorText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  summaryCard: { borderRadius: 20, borderWidth: 1, gap: 18, padding: 17 },
  summaryHeading: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  routeIcon: { alignItems: 'center', borderRadius: 13, height: 40, justifyContent: 'center', width: 40 },
  summaryHeadingCopy: { flex: 1, gap: 2 },
  summaryTitle: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
  summarySubtitle: { fontSize: 12.5, fontWeight: '500', lineHeight: 18 },
  summaryRow: { flexDirection: 'row', gap: 14 },
  metric: { flex: 1, gap: 4 },
  metricLabel: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  metricCaption: { fontSize: 11.5, fontWeight: '600', lineHeight: 16 },
  metricValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.8, lineHeight: 29 },
  detailsCard: { borderRadius: 18, gap: 15, padding: 16 },
  detailsTitle: { fontSize: 16, fontWeight: '800', lineHeight: 22 },
  detailRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 9 },
  note: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  fullWidthButton: { alignSelf: 'stretch', minHeight: 48 },
  primaryButton: { minHeight: 50 },
});
