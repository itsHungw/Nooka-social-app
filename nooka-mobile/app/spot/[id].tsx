import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RoutePreviewSheet } from '@/components/nooka/route-preview-sheet';
import { Button, Chip, CircleButton, Photo, ScreenShell, SectionLabel } from '@/components/nooka/ui';
import {
  externalDirectionsUrl,
  fetchRoutePreview,
  type RoutePreview,
  type TravelMode,
} from '@/features/nooka/directions-api';
import type { Coordinate } from '@/features/nooka/geo';
import { formatDistance, spotDistrict, spotName, tagLabel } from '@/features/nooka/labels';
import { spotTags } from '@/features/nooka/ranking';
import { SPOTS, SPOT_IDS, type SpotId } from '@/features/nooka/spots';
import { getForegroundLocation } from '@/features/nooka/use-user-location';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { useStartCheckin } from '@/hooks/use-start-checkin';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

export default function SpotScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();
  const startCheckin = useStartCheckin();
  const params = useLocalSearchParams<{ id: string }>();

  const id = (SPOT_IDS as readonly string[]).includes(params.id) ? (params.id as SpotId) : 'workshop';
  const spot = SPOTS[id];
  const tags = spotTags(id, demo.extraTags);
  const saved = demo.isSaved(id);
  const [routeMode, setRouteMode] = useState<TravelMode>('DRIVE');
  const [route, setRoute] = useState<RoutePreview | null>(null);
  const [routeOrigin, setRouteOrigin] = useState<Coordinate | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showRoute, setShowRoute] = useState(false);

  useEffect(() => {
    setRoute(null);
    setRouteOrigin(null);
    setRouteError(null);
    setShowRoute(false);
    setRouteMode('DRIVE');
  }, [id]);

  const loadRoute = useCallback(
    async (mode: TravelMode) => {
      setRouteLoading(true);
      setRouteError(null);
      setRoute(null);
      setShowRoute(true);

      try {
        const origin = routeOrigin ?? (await getForegroundLocation());
        const preview = await fetchRoutePreview({ origin, destination: spot.coordinate, mode });
        setRouteOrigin(origin);
        setRoute(preview);
      } catch {
        setRouteError(t('spot.routeError'));
      } finally {
        setRouteLoading(false);
      }
    },
    [routeOrigin, spot.coordinate],
  );

  const openRouteInMaps = useCallback(() => {
    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    void Linking.openURL(externalDirectionsUrl(spot.coordinate, routeMode, platform));
  }, [routeMode, spot.coordinate]);

  const changeRouteMode = useCallback(
    (mode: TravelMode) => {
      setRouteMode(mode);
      void loadRoute(mode);
    },
    [loadRoute],
  );

  return (
    <ScreenShell edges={['top', 'bottom']} testID="spot-screen">
      <Photo style={styles.hero} tint={spot.photoTint}>
        <View style={styles.heroBar}>
          <CircleButton accessibilityLabel={t('common.back')} icon="arrow-back" onPress={() => router.back()} />
          <View style={[styles.heroBadge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.heroBadgeText, { color: colors.text }]}>
              {spot.checkins > 1 ? t('spot.checkinPhotos', { count: spot.checkins }) : t('spot.newOnNooka')}
            </Text>
          </View>
        </View>
      </Photo>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: colors.text }]}>{spotName(id)}</Text>
          <Text style={[styles.district, { color: colors.textMuted }]}>{spotDistrict(id)}</Text>
        </View>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {t('spot.meta', { open: t(`spots.${id}.open`), distance: formatDistance(spot.distanceM) })}
        </Text>

        <View style={styles.actions}>
          <Button
            label={saved ? t('actions.saved') : t('actions.want')}
            onPress={() => demo.toggleSave(id)}
            style={styles.action}
            tone={saved ? 'soft' : 'primary'}
          />
          <Button
            label={t('spot.directions')}
            onPress={() => void loadRoute(routeMode)}
            style={styles.action}
            tone="outline"
          />
          <Button label={t('home.checkin')} onPress={startCheckin} tone="outline" />
        </View>

        <View style={styles.section}>
          <SectionLabel>{t('spot.whatPeopleSay')}</SectionLabel>
        </View>
        <View style={styles.tags}>
          {tags.map((tag) => (
            <Chip count={tag.count} key={tag.id} label={tagLabel(tag.id)} />
          ))}
        </View>

        {spot.hasReview ? (
          <View>
            <View style={styles.review}>
              <View style={[styles.reviewAvatar, { backgroundColor: colors.avatarDefault }]} />
              <View style={styles.reviewCopy}>
                <Text style={[styles.reviewWho, { color: colors.text }]}>
                  {t(`spots.${id}.review.who`)}
                  <Text style={[styles.reviewWhen, { color: colors.textMuted }]}>{` · ${t(`spots.${id}.review.when`)}`}</Text>
                </Text>
                <Text style={[styles.reviewText, { color: colors.text }]}>{`“${t(`spots.${id}.review.text`)}”`}</Text>
              </View>
            </View>
            <Text style={[styles.moreReviews, { color: colors.accentInk }]}>
              {t('spot.moreReviews', { count: spot.reviews })}
            </Text>
          </View>
        ) : (
          <View>
            <Text style={[styles.noReview, { color: colors.textMuted }]}>{t('spot.noReview')}</Text>
            <Button
              label={t('spot.writeOne')}
              onPress={() => {
                demo.openReviewFor(id);
                router.push('/review');
              }}
              style={styles.writeOne}
              tone="outline"
            />
          </View>
        )}

        <View style={[styles.friendLine, { borderColor: colors.borderSubtle }]}>
          <View style={styles.avatarStack}>
            {[0, 1, 2].map((index) => (
              <View
                key={index}
                style={[
                  styles.stackedAvatar,
                  { backgroundColor: colors.avatarDefault, borderColor: colors.background, marginLeft: index ? -9 : 0 },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.friendText, { color: colors.textMuted }]}>
            {spot.friends > 0 ? t('spot.friendsBeen', { count: spot.friends }) : t('spot.noFriends')}
          </Text>
        </View>
      </ScrollView>

      <RoutePreviewSheet
        visible={showRoute}
        spotName={spotName(id)}
        destination={spot.coordinate}
        origin={routeOrigin}
        route={route}
        loading={routeLoading}
        error={routeError}
        mode={routeMode}
        onClose={() => setShowRoute(false)}
        onModeChange={changeRouteMode}
        onRetry={() => void loadRoute(routeMode)}
        onOpenMaps={openRouteInMaps}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: { height: 196 },
  heroBar: { paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBadge: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  heroBadgeText: { fontSize: 12.5, lineHeight: 17, fontWeight: '700' },
  body: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 9 },
  name: { flex: 1, fontSize: 23, lineHeight: 30, fontWeight: '800', letterSpacing: -0.7 },
  district: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  meta: { marginTop: 6, fontSize: 13.5, lineHeight: 19, fontWeight: '500' },
  actions: { marginTop: 14, flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
  section: { marginTop: 20, marginBottom: 11 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  review: { marginTop: 18, flexDirection: 'row', gap: 10 },
  reviewAvatar: { width: 30, height: 30, borderRadius: 15 },
  reviewCopy: { flex: 1, minWidth: 0 },
  reviewWho: { fontSize: 13.5, lineHeight: 19, fontWeight: '700' },
  reviewWhen: { fontSize: 13.5, lineHeight: 19, fontWeight: '500' },
  reviewText: { marginTop: 4, fontSize: 13.5, lineHeight: 21, fontWeight: '500' },
  moreReviews: { marginTop: 12, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  noReview: { marginTop: 16, fontSize: 14, lineHeight: 22, fontWeight: '500' },
  writeOne: { marginTop: 13, alignSelf: 'flex-start' },
  friendLine: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  avatarStack: { flexDirection: 'row' },
  stackedAvatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
  friendText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
});
