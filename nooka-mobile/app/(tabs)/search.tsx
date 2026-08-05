import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NookaSheet } from '@/components/nooka/bottom-sheet';
import { NookaMap, type NookaMapHandle } from '@/components/nooka/nooka-map';
import { SearchOverlay } from '@/components/nooka/search-overlay';
import { Button, Chip, Photo, ResultRow, ScreenShell } from '@/components/nooka/ui';
import {
  checkinLine,
  formatDistance,
  spotDistrict,
  spotName,
  spotTagLine,
  tagLabel,
} from '@/features/nooka/labels';
import {
  SPOTS,
  SPOTS_BY_CHECKINS,
  SPOTS_BY_DISTANCE,
  SPOTS_BY_FRIENDS,
  type SpotId,
  type TagId,
} from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

/**
 * Tab Tìm — trước đây là tab Bản đồ.
 *
 * Bản đồ không còn là một màn hình riêng, nó là **canvas** của việc tìm: một
 * thanh tìm kiếm mang cả universal search lẫn `Hỏi Nooka` (§6 của spec), chip
 * lọc chung cho cả ghim lẫn danh sách, và một sheet ba điểm dừng đựng kết quả.
 *
 * Ba trạng thái của sheet:
 *   - không chọn ghim → danh sách kết quả
 *   - chọn một ghim   → preview card của đúng địa điểm đó
 *   - đang gõ         → `SearchOverlay` phủ lên trên
 */

const SORTS = ['busy', 'near', 'friends'] as const;
type SortId = (typeof SORTS)[number];

const SORT_ORDER: Record<SortId, readonly SpotId[]> = {
  busy: SPOTS_BY_CHECKINS,
  near: SPOTS_BY_DISTANCE,
  friends: SPOTS_BY_FRIENDS,
};

/** Chip lọc trên bản đồ. Ít thôi — rail dài quá thì không ai kéo tới cuối. */
const FILTER_TAGS: TagId[] = ['quiet', 'workFriendly', 'openLate', 'outdoor', 'niceView'];

export default function SearchTabScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const insets = useSafeAreaInsets();
  const demo = useNookaDemo();
  const mapRef = useRef<NookaMapHandle>(null);

  const [containerHeight, setContainerHeight] = useState(0);
  const [snapIndex, setSnapIndex] = useState(0);
  const [selected, setSelected] = useState<SpotId | null>(null);
  const [sort, setSort] = useState<SortId>('busy');
  const [activeTags, setActiveTags] = useState<TagId[]>([]);
  const [visitedOnly, setVisitedOnly] = useState(false);
  const [typing, setTyping] = useState(false);

  const snapHeights = useMemo(() => {
    const base = containerHeight || 600;
    return [Math.round(base * 0.34), Math.round(base * 0.62), Math.round(base * 0.92)];
  }, [containerHeight]);

  const results = useMemo(() => {
    const ordered = SORT_ORDER[sort];
    return ordered.filter((id) => {
      if (visitedOnly && !demo.isBeen(id)) return false;
      return activeTags.every((tag) => SPOTS[id].tags.some((spotTag) => spotTag.id === tag));
    });
  }, [sort, activeTags, visitedOnly, demo]);

  // Ghim đang chọn mà bị lọc mất thì bỏ chọn, nếu không sheet sẽ hiện preview
  // của một chỗ không còn trên bản đồ.
  useEffect(() => {
    if (selected && !results.includes(selected)) setSelected(null);
  }, [results, selected]);

  const pickSpot = useCallback((id: SpotId) => {
    setSelected(id);
    // Nấc 1, không phải nấc 0: preview card cao hơn nấc peek nên ở nấc 0 hai nút
    // "Muốn đi" / "Xem chỗ này" bị khuất dưới mép — người dùng phải kéo mới thấy
    // thứ đáng bấm nhất.
    setSnapIndex(1);
    mapRef.current?.focusSpot(id, snapHeights[1]);
  }, [snapHeights]);

  const openSpot = useCallback(
    (id: SpotId) => router.push({ pathname: '/spot/[id]', params: { id } }),
    [router],
  );

  const toggleTag = useCallback((tag: TagId) => {
    setActiveTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }, []);

  return (
    <ScreenShell edges={[]} testID="search-screen">
      <View onLayout={(event) => setContainerHeight(event.nativeEvent.layout.height)} style={styles.fill}>
        <NookaMap
          mapPadding={{ top: insets.top + 110, bottom: snapHeights[snapIndex] }}
          onPressMap={() => setSelected(null)}
          onSelectSpot={pickSpot}
          ref={mapRef}
          selectedSpot={selected}
          spots={results}
          style={StyleSheet.absoluteFill}
        />

        <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <SearchBar onPress={() => setTyping(true)} />
          <ScrollView
            contentContainerStyle={styles.rail}
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}>
            <Chip floating label={t('home.location')} trailing="▾" />
            {FILTER_TAGS.map((tag) => (
              <Chip
                floating
                key={tag}
                label={tagLabel(tag)}
                onPress={() => toggleTag(tag)}
                selected={activeTags.includes(tag)}
                trailing={activeTags.includes(tag) ? '✕' : undefined}
              />
            ))}
          </ScrollView>
        </View>

        <View
          pointerEvents="box-none"
          style={[styles.controls, { bottom: snapHeights[snapIndex] + 16 }]}>
          <Chip
            floating
            label={t('map.layerVisited')}
            onPress={() => setVisitedOnly((current) => !current)}
            selected={visitedOnly}
          />
          <Pressable
            accessibilityLabel={t('map.recenter')}
            accessibilityRole="button"
            onPress={() => {
              setSelected(null);
              mapRef.current?.recenter();
            }}
            style={({ pressed }) => [
              styles.fab,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                shadowColor: colors.shadow,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <Ionicons color={colors.text} name="locate" size={21} />
          </Pressable>
        </View>

        <NookaSheet
          header={
            selected ? (
              <View style={styles.sheetHeadSpacer} />
            ) : (
              <View style={styles.sheetHead}>
                <View style={styles.sheetTitleRow}>
                  <Text style={[styles.sheetTitle, { color: colors.text }]}>
                    {t('map.nearbyCount', { count: results.length })}
                  </Text>
                  <Text style={[styles.sheetSource, { color: colors.textSubtle }]}>
                    {t('map.nearbySource')}
                  </Text>
                </View>
                <View style={styles.sorts}>
                  {SORTS.map((id) => (
                    <Chip
                      key={id}
                      label={t(`map.sort.${id}`)}
                      onPress={() => setSort(id)}
                      selected={sort === id}
                    />
                  ))}
                </View>
              </View>
            )
          }
          index={snapIndex}
          onIndexChange={setSnapIndex}
          snapHeights={snapHeights}>
          {selected ? (
            <SpotPreview
              onClose={() => setSelected(null)}
              onOpen={() => openSpot(selected)}
              spot={selected}
            />
          ) : (
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {results.length === 0 ? (
                <Text style={[styles.empty, { color: colors.textMuted }]}>{t('search.empty')}</Text>
              ) : (
                results.map((id) => (
                  <ResultRow
                    badge={SPOTS[id].isNew ? t('pin.new') : undefined}
                    distance={formatDistance(SPOTS[id].distanceM)}
                    key={id}
                    onPress={() => pickSpot(id)}
                    reason={checkinLine(id)}
                    tags={spotTagLine(id)}
                    tint={SPOTS[id].photoTint}
                    title={spotName(id)}
                  />
                ))
              )}
              {snapIndex === 0 && results.length > 2 ? (
                <Text style={[styles.more, { color: colors.textSubtle }]}>{t('map.dragForMore')}</Text>
              ) : null}
            </ScrollView>
          )}
        </NookaSheet>

        {typing ? (
          <SearchOverlay
            onClose={() => setTyping(false)}
            onPickSpot={(id) => {
              setTyping(false);
              pickSpot(id);
            }}
          />
        ) : null}
      </View>
    </ScreenShell>
  );
}

/** Một thanh, hai hệ thống (§6): universal search bên trái, `Hỏi Nooka` bên phải. */
function SearchBar({ onPress }: { onPress: () => void }) {
  const { colors } = useNookaTheme();
  const router = useRouter();

  return (
    <Pressable
      accessibilityLabel={t('search.universalPlaceholder')}
      accessibilityRole="search"
      onPress={onPress}
      style={({ pressed }) => [
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
          shadowColor: colors.shadow,
          opacity: pressed ? 0.9 : 1,
        },
      ]}>
      <Ionicons color={colors.textMuted} name="search" size={17} />
      <Text numberOfLines={1} style={[styles.barText, { color: colors.textSubtle }]}>
        {t('search.universalPlaceholder')}
      </Text>
      <Pressable
        accessibilityLabel={t('search.askShort')}
        accessibilityRole="button"
        onPress={() => router.push('/ask')}
        style={({ pressed }) => [
          styles.askPill,
          { backgroundColor: pressed ? colors.inverseSurfacePressed : colors.inverseSurface },
        ]}>
        <View style={[styles.askRing, { borderColor: colors.accent }]} />
        <Text style={[styles.askText, { color: colors.onInverse }]}>{t('search.askShort')}</Text>
      </Pressable>
    </Pressable>
  );
}

/** Sheet khi có ghim đang chọn — quyết định ngay tại chỗ, không nhảy sang màn khác. */
function SpotPreview({
  spot,
  onOpen,
  onClose,
}: {
  spot: SpotId;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();
  const detail = SPOTS[spot];

  return (
    <ScrollView contentContainerStyle={styles.preview} showsVerticalScrollIndicator={false}>
      <View style={styles.previewHead}>
        <Text numberOfLines={1} style={[styles.previewName, { color: colors.text }]}>
          {spotName(spot)}
        </Text>
        <Pressable
          accessibilityLabel={t('common.close')}
          accessibilityRole="button"
          hitSlop={10}
          onPress={onClose}>
          <Ionicons color={colors.textMuted} name="close" size={22} />
        </Pressable>
      </View>

      <Photo style={styles.previewPhoto} tint={detail.photoTint}>
        <View style={[styles.previewBadge, { backgroundColor: colors.background }]}>
          <Text style={[styles.previewBadgeText, { color: colors.textMuted }]}>
            {detail.checkins > 1
              ? t('spot.checkinPhotos', { count: detail.checkins })
              : t('spot.newOnNooka')}
          </Text>
        </View>
        <View style={[styles.previewPill, { backgroundColor: colors.inverseSurface }]}>
          <Ionicons color={colors.accent} name="people" size={13} />
          <Text style={[styles.previewPillText, { color: colors.onInverse }]}>
            {checkinLine(spot)}
          </Text>
        </View>
      </Photo>

      <Text style={[styles.previewMeta, { color: colors.textMuted }]}>
        {`${spotDistrict(spot)} · ${t('spot.meta', {
          open: t(`spots.${spot}.open`),
          distance: formatDistance(detail.distanceM),
        })}`}
      </Text>

      <View style={styles.previewTags}>
        {detail.tags.slice(0, 3).map((tag) => (
          <Chip count={tag.count} key={tag.id} label={tagLabel(tag.id)} />
        ))}
      </View>

      <View style={styles.previewActions}>
        <Button
          label={demo.isSaved(spot) ? t('actions.saved') : t('actions.want')}
          onPress={() => demo.toggleSave(spot)}
          style={styles.previewAction}
          tone={demo.isSaved(spot) ? 'soft' : 'primary'}
        />
        <Button
          label={t('spot.viewSpot')}
          onPress={onOpen}
          style={styles.previewAction}
          tone="outline"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { position: 'absolute', left: 0, right: 0, top: 0 },
  bar: {
    marginHorizontal: 16,
    minHeight: 52,
    borderRadius: 17,
    borderWidth: 1,
    paddingLeft: 15,
    paddingRight: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 6,
  },
  barText: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 19, fontWeight: '600', letterSpacing: -0.2 },
  askPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingLeft: 11,
    paddingRight: 13,
    paddingVertical: 9,
  },
  askRing: { width: 13, height: 13, borderRadius: 7, borderWidth: 2 },
  askText: { fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: -0.2 },
  rail: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  controls: { position: 'absolute', right: 16, alignItems: 'flex-end', gap: 10 },
  fab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
  sheetHead: { paddingHorizontal: 20, paddingTop: 16 },
  sheetHeadSpacer: { height: 8 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 9 },
  sheetTitle: { fontSize: 17, lineHeight: 23, fontWeight: '800', letterSpacing: -0.5 },
  sheetSource: { flex: 1, fontSize: 12.5, lineHeight: 17, fontWeight: '500' },
  sorts: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingTop: 12, paddingBottom: 4 },
  list: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 28 },
  empty: { paddingTop: 18, fontSize: 14, lineHeight: 22, fontWeight: '500' },
  more: { paddingTop: 14, fontSize: 12.5, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
  preview: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 28 },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewName: { flex: 1, fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.6 },
  previewPhoto: { marginTop: 14, height: 132, borderRadius: 18 },
  previewBadge: { position: 'absolute', left: 12, top: 12, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  previewBadgeText: { fontSize: 10, lineHeight: 14, fontWeight: '700', letterSpacing: 1 },
  previewPill: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  previewPillText: { fontSize: 11.5, lineHeight: 16, fontWeight: '700' },
  previewMeta: { marginTop: 14, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  previewTags: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  previewActions: { marginTop: 18, flexDirection: 'row', gap: 8 },
  previewAction: { flex: 1, minHeight: 48 },
});
