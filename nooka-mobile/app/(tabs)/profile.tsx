import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NookaMap } from '@/components/nooka/nooka-map';
import { NookaMascot } from '@/components/nooka/nooka-mascot';
import { Photo, ResultRow, ScreenShell, SectionLabel, SpotRow } from '@/components/nooka/ui';
import { formatDistance, spotDistrict, spotName, spotTagLine } from '@/features/nooka/labels';
import { SPOTS, type SpotId } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

type ProfileTab = 'map' | 'checkins' | 'wantToGo';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const { wantToGo, been, myPosts } = useNookaDemo();

  const [activeTab, setActiveTab] = useState<ProfileTab>('map');
  const [activeFilter, setActiveFilter] = useState<'all' | 'nearby' | 'openLate' | 'cheap'>('all');

  const checkinsCount = myPosts.length;
  const beenCount = been.length;
  const wantToGoCount = wantToGo.length;
  const beenSpots = been;
  const wantToGoSpots = wantToGo;
  const mapSpots = [...new Set<SpotId>([...been, ...wantToGo])];
  const mapDistricts = new Set(mapSpots.map(spotDistrict)).size;
  const checkinPlaces = new Set(myPosts.map((post) => post.spot)).size;
  const checkinItems = myPosts.map((post, idx) => ({
    id: post.id,
    spot: post.spot,
    label: spotDistrict(post.spot),
    date: t(post.timeKey ?? 'time.justNow'),
    latest: idx === 0,
  }));

  return (
    <ScreenShell testID="profile-screen">
      {/* Top Header Navigation */}
      <View style={styles.topHeader}>
        <Text style={[styles.handleText, { color: colors.text }]}>{t('profile.title')}</Text>
        <View style={styles.topHeaderActions}>
          <Pressable
            accessibilityLabel={t('profile.shareMap')}
            accessibilityRole="button"
            onPress={() => router.push('/share-map')}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <Ionicons color={colors.text} name="share-outline" size={20} />
          </Pressable>
          <Pressable
            accessibilityLabel={t('navigation.settings')}
            accessibilityRole="button"
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <Ionicons color={colors.text} name="ellipsis-horizontal" size={20} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Profile User Info Header */}
        <View style={styles.profileHeader}>
          <Pressable
            accessibilityLabel={t('profile.editProfile')}
            accessibilityRole="button"
            onPress={() => router.push('/edit-profile')}
            style={({ pressed }) => [styles.avatarRow, { opacity: pressed ? 0.8 : 1 }]}>
            <View style={[styles.avatarWrap, { backgroundColor: colors.avatarDefault }]}>
              <View style={[styles.avatarPinBadge, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <Ionicons color={colors.accentInk} name="location" size={10} />
              </View>
            </View>
            <View style={styles.identityCol}>
              <Text style={[styles.userName, { color: colors.text }]}>{t('profile.name')}</Text>
              <Text style={[styles.userHandle, { color: colors.textMuted }]}>{t('profile.handle')}</Text>
              <Text style={[styles.userMeta, { color: colors.textMuted }]}>{t('profile.meta')}</Text>
            </View>
          </Pressable>

          <Text style={[styles.bioText, { color: colors.text }]}>{t('profile.bio')}</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{String(checkinsCount)}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('profile.stats.checkins')}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{String(beenCount)}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('profile.stats.been')}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{String(wantToGoCount)}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('profile.stats.saved')}</Text>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          <Pressable
            accessibilityLabel={t('profile.editProfile')}
            accessibilityRole="button"
            onPress={() => router.push('/edit-profile')}
            style={({ pressed }) => [
              styles.actionPillBtn,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
            ]}>
            <Text style={[styles.actionPillText, { color: colors.text }]}>{t('profile.editProfile')}</Text>
          </Pressable>

          <Pressable
            accessibilityLabel={t('profile.shareMap')}
            accessibilityRole="button"
            onPress={() => router.push('/share-map')}
            style={({ pressed }) => [
              styles.actionPillBtn,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
            ]}>
            <Text style={[styles.actionPillText, { color: colors.text }]}>{t('profile.shareMap')}</Text>
          </Pressable>

          <Pressable
            accessibilityLabel={t('profile.addFriend')}
            accessibilityRole="button"
            onPress={() => router.push('/add-friends')}
            style={({ pressed }) => [
              styles.actionIconBtn,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
            ]}>
            <Ionicons color={colors.text} name="person-add-outline" size={17} />
          </Pressable>
        </View>

        {/* Segmented Tab Navigation Bar */}
        <View style={[styles.tabSegmentBar, { borderColor: colors.borderSubtle }]}>
          <Pressable
            accessibilityLabel={t('profile.tabs.map')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'map' }}
            onPress={() => setActiveTab('map')}
            style={[styles.tabSegment, activeTab === 'map' && { borderBottomColor: colors.inverseSurface }]}>
            <Ionicons
              color={activeTab === 'map' ? colors.text : colors.textMuted}
              name={activeTab === 'map' ? 'map' : 'map-outline'}
              size={16}
            />
            <Text
              style={[
                styles.tabSegmentText,
                { color: activeTab === 'map' ? colors.text : colors.textMuted, fontWeight: activeTab === 'map' ? '700' : '500' },
              ]}>
              {t('profile.tabs.map')}
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel={t('profile.tabs.checkins')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'checkins' }}
            onPress={() => setActiveTab('checkins')}
            style={[styles.tabSegment, activeTab === 'checkins' && { borderBottomColor: colors.inverseSurface }]}>
            <Ionicons
              color={activeTab === 'checkins' ? colors.text : colors.textMuted}
              name={activeTab === 'checkins' ? 'grid' : 'grid-outline'}
              size={16}
            />
            <Text
              style={[
                styles.tabSegmentText,
                { color: activeTab === 'checkins' ? colors.text : colors.textMuted, fontWeight: activeTab === 'checkins' ? '700' : '500' },
              ]}>
              {t('profile.tabs.checkins')}
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel={t('profile.tabs.wantToGo')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'wantToGo' }}
            onPress={() => setActiveTab('wantToGo')}
            style={[styles.tabSegment, activeTab === 'wantToGo' && { borderBottomColor: colors.inverseSurface }]}>
            <Ionicons
              color={activeTab === 'wantToGo' ? colors.text : colors.textMuted}
              name={activeTab === 'wantToGo' ? 'bookmark' : 'bookmark-outline'}
              size={16}
            />
            <Text
              style={[
                styles.tabSegmentText,
                { color: activeTab === 'wantToGo' ? colors.text : colors.textMuted, fontWeight: activeTab === 'wantToGo' ? '700' : '500' },
              ]}>
              {t('profile.tabs.wantToGo')}
            </Text>
            <View style={[styles.countBadge, { backgroundColor: colors.surfaceMuted }]}>
              <Text style={[styles.countBadgeText, { color: colors.textMuted }]}>{String(wantToGoCount)}</Text>
            </View>
          </Pressable>
        </View>

        {/* Dynamic Tab Body */}
        {activeTab === 'map' && (
          <View style={styles.tabContent}>
            {/* Embedded Map Container */}
            <View style={[styles.mapCardContainer, { borderColor: colors.borderSubtle, backgroundColor: colors.surfaceMuted }]}>
              <NookaMap spots={mapSpots} style={styles.mapView} />

              {/* Map Top Floating Pill Overlay */}
              <View style={[styles.mapSummaryPill, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.mapSummaryText, { color: colors.text }]}>
                  {t('profile.mapOverlay.summary', { places: mapSpots.length, districts: mapDistricts })}
                </Text>
              </View>

              {/* Map Bottom Legend Overlay */}
              <View style={[styles.mapLegendPill, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDotSolid, { backgroundColor: colors.accentStrong }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>{t('profile.mapOverlay.been')}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDotOutline, { borderColor: colors.accentStrong }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>{t('profile.mapOverlay.wantToGo')}</Text>
                </View>
              </View>
            </View>

            {/* Places You Have Been List Section */}
            <View style={styles.sectionHeaderRow}>
              <SectionLabel>{t('profile.placesYouHaveBeen')}</SectionLabel>
              <Pressable
                accessibilityLabel={t('profile.seeAll')}
                accessibilityRole="button"
                onPress={() => router.push('/(tabs)/search')}>
                <Text style={[styles.seeAllText, { color: colors.textMuted }]}>{t('profile.seeAll')}</Text>
              </Pressable>
            </View>

            <View style={styles.spotsList}>
              {beenSpots.length > 0 ? (
                beenSpots.map((id) => (
                  <SpotRow
                    key={id}
                    line={`${spotDistrict(id)} · ${SPOTS[id].checkins} check-ins · ${formatDistance(SPOTS[id].distanceM)}`}
                    onPress={() => router.push({ pathname: '/spot/[id]', params: { id } })}
                    tint={SPOTS[id].photoTint}
                    title={spotName(id)}
                  />
                ))
              ) : (
                <Text style={[styles.emptyState, { color: colors.textMuted }]}>{t('profile.emptyBeen')}</Text>
              )}
            </View>
          </View>
        )}

        {activeTab === 'checkins' && (
          <View style={styles.tabContent}>
            {/* Check-ins Subheader */}
            <View style={styles.checkinsHeaderRow}>
              <Text style={[styles.checkinsCountText, { color: colors.textMuted }]}>
                {t('profile.checkinsSubheader', { checkins: checkinsCount, places: checkinPlaces })}
              </Text>
              <Pressable
                accessibilityLabel={t('profile.newest')}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.sortDropdown,
                  { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.75 : 1 },
                ]}>
                <Text style={[styles.sortText, { color: colors.text }]}>{t('profile.newest')}</Text>
                <Ionicons color={colors.text} name="chevron-down" size={14} />
              </Pressable>
            </View>

            {/* 3-Column Photo Grid */}
            <View style={styles.photoGrid}>
              {checkinItems.length > 0 ? checkinItems.map((item) => (
                <Pressable
                  accessibilityLabel={spotName(item.spot as SpotId)}
                  accessibilityRole="button"
                  key={item.id}
                  onPress={() => router.push({ pathname: '/spot/[id]', params: { id: item.spot } })}
                  style={styles.gridCellWrap}>
                  <Photo style={styles.gridPhotoTile} tint={SPOTS[item.spot as SpotId].photoTint}>
                    <View style={styles.tileTopRow}>
                      {item.latest ? (
                        <View style={[styles.latestBadge, { backgroundColor: colors.accent }]}>
                          <Text style={[styles.latestBadgeText, { color: colors.onAccent }]}>{t('profile.latest')}</Text>
                        </View>
                      ) : (
                        <View />
                      )}
                      <View style={styles.dateOverlayBadge}>
                        <Text style={[styles.dateOverlayText, { color: colors.captionText }]}>{item.date}</Text>
                      </View>
                    </View>
                    <View style={styles.districtTagOverlay}>
                      <Text style={[styles.districtTagText, { color: colors.captionText }]}>{item.label}</Text>
                    </View>
                  </Photo>
                </Pressable>
              )) : (
                <Text style={[styles.emptyState, { color: colors.textMuted }]}>{t('profile.emptyCheckins')}</Text>
              )}
            </View>
          </View>
        )}

        {activeTab === 'wantToGo' && (
          <View style={styles.tabContent}>
            {/* Horizontal Filter Chips */}
            <ScrollView horizontal contentContainerStyle={styles.filterScroll} showsHorizontalScrollIndicator={false}>
              <Pressable
                accessibilityLabel={t('profile.filters.all', { count: wantToGoCount })}
                accessibilityRole="button"
                onPress={() => setActiveFilter('all')}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: activeFilter === 'all' ? colors.inverseSurface : colors.surface,
                    borderColor: activeFilter === 'all' ? colors.inverseSurface : colors.border,
                  },
                ]}>
                <Text style={[styles.filterPillText, { color: activeFilter === 'all' ? colors.onInverse : colors.text }]}>
                  {t('profile.filters.all', { count: wantToGoCount })}
                </Text>
              </Pressable>

              <Pressable
                accessibilityLabel={t('profile.filters.nearby')}
                accessibilityRole="button"
                onPress={() => setActiveFilter('nearby')}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: activeFilter === 'nearby' ? colors.inverseSurface : colors.surface,
                    borderColor: activeFilter === 'nearby' ? colors.inverseSurface : colors.border,
                  },
                ]}>
                <Text style={[styles.filterPillText, { color: activeFilter === 'nearby' ? colors.onInverse : colors.text }]}>
                  {t('profile.filters.nearby')}
                </Text>
              </Pressable>

              <Pressable
                accessibilityLabel={t('profile.filters.openLate')}
                accessibilityRole="button"
                onPress={() => setActiveFilter('openLate')}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: activeFilter === 'openLate' ? colors.inverseSurface : colors.surface,
                    borderColor: activeFilter === 'openLate' ? colors.inverseSurface : colors.border,
                  },
                ]}>
                <Text style={[styles.filterPillText, { color: activeFilter === 'openLate' ? colors.onInverse : colors.text }]}>
                  {t('profile.filters.openLate')}
                </Text>
              </Pressable>

              <Pressable
                accessibilityLabel={t('profile.filters.cheap')}
                accessibilityRole="button"
                onPress={() => setActiveFilter('cheap')}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: activeFilter === 'cheap' ? colors.inverseSurface : colors.surface,
                    borderColor: activeFilter === 'cheap' ? colors.inverseSurface : colors.border,
                  },
                ]}>
                <Text style={[styles.filterPillText, { color: activeFilter === 'cheap' ? colors.onInverse : colors.text }]}>
                  {t('profile.filters.cheap')}
                </Text>
              </Pressable>
            </ScrollView>

            {/* Assistant Callout Banner */}
            <Pressable
              accessibilityLabel={t('profile.assistantBanner')}
              accessibilityRole="button"
              onPress={() => router.push('/ask')}
              style={({ pressed }) => [
                styles.assistantCard,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.borderSubtle, opacity: pressed ? 0.85 : 1 },
              ]}>
              <View style={[styles.mascotIconCircle, { backgroundColor: colors.surface }]}>
                <NookaMascot />
              </View>
              <Text style={[styles.assistantText, { color: colors.text }]}>{t('profile.assistantBanner')}</Text>
              <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
            </Pressable>

            {/* Want to go Places List */}
            <View style={styles.wantToGoList}>
              {wantToGoSpots.length > 0 ? wantToGoSpots.map((id) => (
                <ResultRow
                  badge={SPOTS[id].isNew ? t('spots.sansau.busy') : undefined}
                  distance={formatDistance(SPOTS[id].distanceM)}
                  key={id}
                  onPress={() => router.push({ pathname: '/spot/[id]', params: { id } })}
                  reason={spotTagLine(id)}
                  tags={`${spotDistrict(id)}`}
                  tint={SPOTS[id].photoTint}
                  title={spotName(id)}
                />
              )) : (
                <Text style={[styles.emptyState, { color: colors.textMuted }]}>{t('profile.emptyWantToGo')}</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  handleText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  topHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  profileHeader: {
    marginBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    position: 'relative',
  },
  avatarPinBadge: {
    position: 'absolute',
    left: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCol: {
    gap: 2,
  },
  userName: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  userHandle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  userMeta: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
  },
  bioText: {
    marginTop: 12,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  statNum: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  actionPillBtn: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPillText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  actionIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSegmentBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tabSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabSegmentText: {
    fontSize: 13,
    lineHeight: 18,
  },
  countBadge: {
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countBadgeText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  tabContent: {
    gap: 16,
  },
  mapCardContainer: {
    height: 210,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  mapView: {
    width: '100%',
    height: '100%',
  },
  mapSummaryPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mapSummaryText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  mapLegendPill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDotSolid: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDotOutline: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  legendText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  seeAllText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  spotsList: {
    gap: 4,
  },
  checkinsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkinsCountText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  sortDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sortText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridCellWrap: {
    width: '31.5%',
  },
  gridPhotoTile: {
    height: 110,
    borderRadius: 14,
    justifyContent: 'space-between',
    padding: 6,
  },
  tileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  latestBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  latestBadgeText: {
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: '800',
  },
  dateOverlayBadge: {
    backgroundColor: 'rgba(20,18,15,0.45)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  dateOverlayText: {
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: '600',
  },
  districtTagOverlay: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(20,18,15,0.45)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 'auto',
  },
  districtTagText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
  },
  filterScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  filterPill: {
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600',
  },
  assistantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  mascotIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  wantToGoList: {
    gap: 6,
    marginTop: 4,
  },
  emptyState: { width: '100%', paddingVertical: 28, textAlign: 'center', fontSize: 13.5, lineHeight: 20, fontWeight: '500' },
});
