import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { CommentSheet, PostSocialActions } from '@/components/nooka/post-social';
import { RoutePreviewSheet } from '@/components/nooka/route-preview-sheet';
import { Button, Chip, CircleButton, Photo, ScreenShell, SectionLabel } from '@/components/nooka/ui';
import {
  externalDirectionsUrl,
  fetchRoutePreview,
  type RoutePreview,
  type TravelMode,
} from '@/features/nooka/directions-api';
import type { Coordinate } from '@/features/nooka/geo';
import { formatDistance, spotDistrict, spotName, tagLabel, wantToGoLabel } from '@/features/nooka/labels';
import { spotTags, type SpotTag } from '@/features/nooka/ranking';
import { SPOTS, SPOT_IDS, type FeedPost, type SpotId } from '@/features/nooka/spots';
import { getForegroundLocation } from '@/features/nooka/use-user-location';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { useStartCheckin } from '@/hooks/use-start-checkin';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

const HERO_HEIGHT = 244;

type SpotFeedItem =
  | { key: 'spot-bar'; kind: 'spotBar' }
  | { key: 'summary'; kind: 'summary' }
  | { key: 'community-header'; kind: 'communityHeader' }
  | { key: 'privacy'; kind: 'privacy'; count: number }
  | { key: 'empty'; kind: 'empty' }
  | { key: string; kind: 'post'; post: FeedPost };

export default function SpotScreen() {
  const router = useRouter();
  const demo = useNookaDemo();
  const startCheckin = useStartCheckin();
  const params = useLocalSearchParams<{ id: string }>();

  const id = (SPOT_IDS as readonly string[]).includes(params.id) ? (params.id as SpotId) : 'workshop';
  const spot = SPOTS[id];
  const tags = spotTags(id, demo.extraTags);
  const wantsToGo = demo.wantsToGo(id);
  const publicPosts = demo.feed.filter((post) => post.spot === id && post.visibility === 'PUBLIC');
  const hiddenOwnPostCount = demo.feed.filter(
    (post) => post.spot === id && post.friend === null && post.visibility !== 'PUBLIC',
  ).length;

  const [routeMode, setRouteMode] = useState<TravelMode>('DRIVE');
  const [route, setRoute] = useState<RoutePreview | null>(null);
  const [routeOrigin, setRouteOrigin] = useState<Coordinate | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const commentPost = demo.feed.find((post) => post.id === commentPostId) ?? null;

  const listItems: SpotFeedItem[] = [
    { key: 'spot-bar', kind: 'spotBar' },
    { key: 'summary', kind: 'summary' },
    { key: 'community-header', kind: 'communityHeader' },
    ...(hiddenOwnPostCount > 0
      ? ([{ key: 'privacy', kind: 'privacy', count: hiddenOwnPostCount }] satisfies SpotFeedItem[])
      : []),
    ...(publicPosts.length > 0
      ? publicPosts.map((post): SpotFeedItem => ({ key: post.id, kind: 'post', post }))
      : ([{ key: 'empty', kind: 'empty' }] satisfies SpotFeedItem[])),
  ];

  useEffect(() => {
    setRoute(null);
    setRouteOrigin(null);
    setRouteError(null);
    setShowRoute(false);
    setRouteMode('DRIVE');
    setHeaderCollapsed(false);
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

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const collapsed = event.nativeEvent.contentOffset.y >= HERO_HEIGHT - 20;
    setHeaderCollapsed((current) => (current === collapsed ? current : collapsed));
  }, []);
  const openComments = useCallback((postId: string) => setCommentPostId(postId), []);

  const renderItem: ListRenderItem<SpotFeedItem> = ({ item }) => {
    switch (item.kind) {
      case 'spotBar':
        return (
          <StickySpotBar
            collapsed={headerCollapsed}
            id={id}
            onBack={() => router.back()}
            onCheckin={startCheckin}
            onDirections={() => void loadRoute(routeMode)}
            onWantToGo={() => demo.toggleWantToGo(id)}
            wantsToGo={wantsToGo}
          />
        );
      case 'summary':
        return <SpotSummary id={id} tags={tags} />;
      case 'communityHeader':
        return <CommunityHeader count={publicPosts.length} />;
      case 'privacy':
        return <PrivacyNote count={item.count} />;
      case 'post':
        return <CommunityPostCard onComment={openComments} post={item.post} />;
      case 'empty':
        return <CommunityEmpty />;
    }
  };

  return (
    <ScreenShell edges={['top', 'bottom']} testID="spot-screen">
      <FlatList
        contentContainerStyle={styles.listContent}
        data={listItems}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={(
          <SpotHero id={id} onBack={() => router.back()} />
        )}
        onScroll={handleScroll}
        renderItem={renderItem}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      />

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
      <CommentSheet post={commentPost} visible={Boolean(commentPost)} onClose={() => setCommentPostId(null)} />
    </ScreenShell>
  );
}

function SpotHero({ id, onBack }: { id: SpotId; onBack: () => void }) {
  const { colors } = useNookaTheme();
  const spot = SPOTS[id];

  return (
    <Photo style={styles.hero} tint={spot.photoTint}>
      <View style={styles.heroBar}>
        <CircleButton accessibilityLabel={t('common.back')} icon="arrow-back" onPress={onBack} />
        <View style={[styles.heroBadge, { backgroundColor: colors.surface }]}>
          <Text style={[styles.heroBadgeText, { color: colors.text }]}>
            {spot.checkins > 1 ? t('spot.checkinPhotos', { count: spot.checkins }) : t('spot.newOnNooka')}
          </Text>
        </View>
      </View>
    </Photo>
  );
}

function StickySpotBar({
  id,
  collapsed,
  wantsToGo,
  onBack,
  onWantToGo,
  onDirections,
  onCheckin,
}: {
  id: SpotId;
  collapsed: boolean;
  wantsToGo: boolean;
  onBack: () => void;
  onWantToGo: () => void;
  onDirections: () => void;
  onCheckin: () => void;
}) {
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();
  const spot = SPOTS[id];

  return (
    <View style={[styles.stickyBar, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
      <View style={styles.identityRow}>
        {collapsed ? <CircleButton accessibilityLabel={t('common.back')} icon="arrow-back" onPress={onBack} size={44} /> : null}
        <View accessible accessibilityLabel={spotName(id)} accessibilityRole="image">
          <Photo style={styles.spotThumb} tint={spot.photoTint} />
        </View>
        <View style={styles.identityCopy}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{spotName(id)}</Text>
            <Text style={[styles.district, { color: colors.textMuted }]}>{spotDistrict(id)}</Text>
          </View>
          <Text numberOfLines={1} style={[styles.meta, { color: colors.textMuted }]}>
            {t('spot.meta', { open: t(`spots.${id}.open`), distance: formatDistance(spot.distanceM) })}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button
          label={wantToGoLabel(demo.isBeen(id), wantsToGo)}
          onPress={onWantToGo}
          selected={wantsToGo}
          style={styles.action}
          tone={wantsToGo ? 'soft' : 'primary'}
        />
        <Button label={t('spot.directions')} onPress={onDirections} style={styles.action} tone="outline" />
        <Button label={t('home.checkin')} onPress={onCheckin} style={styles.action} tone="outline" />
      </View>
    </View>
  );
}

function SpotSummary({ id, tags }: { id: SpotId; tags: SpotTag[] }) {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();
  const spot = SPOTS[id];

  return (
    <View style={styles.summary}>
      <SectionLabel>{t('spot.whatPeopleSay')}</SectionLabel>
      <View style={styles.tags}>
        {tags.map((tag) => <Chip count={tag.count} key={tag.id} label={tagLabel(tag.id)} />)}
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
          <Text style={[styles.moreReviews, { color: colors.accentInk }]}>{t('spot.moreReviews', { count: spot.reviews })}</Text>
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
    </View>
  );
}

function CommunityHeader({ count }: { count: number }) {
  const { colors } = useNookaTheme();
  return (
    <View style={[styles.communityHeader, { borderColor: colors.borderSubtle }]}>
      <View style={styles.communityHeadingCopy}>
        <SectionLabel>{t('spot.communityTitle')}</SectionLabel>
        <Text style={[styles.communityCount, { color: colors.textMuted }]}>{t('spot.publicPostCount', { count })}</Text>
      </View>
      <View style={[styles.publicBadge, { backgroundColor: colors.surfaceMuted }]}>
        <Ionicons color={colors.textMuted} name="earth-outline" size={13} />
        <Text style={[styles.publicBadgeText, { color: colors.textMuted }]}>{t('spot.publicOnly')}</Text>
      </View>
    </View>
  );
}

function PrivacyNote({ count }: { count: number }) {
  const { colors } = useNookaTheme();
  return (
    <View style={[styles.privacyNote, { backgroundColor: colors.surfaceMuted }]}>
      <View style={[styles.privacyIcon, { backgroundColor: colors.surface }]}>
        <Ionicons color={colors.textMuted} name="eye-off-outline" size={17} />
      </View>
      <Text style={[styles.privacyNoteText, { color: colors.textMuted }]}>{t('spot.privatePostNote', { count })}</Text>
    </View>
  );
}

const CommunityPostCard = memo(function CommunityPostCard({ post, onComment }: {
  post: FeedPost;
  onComment: (postId: string) => void;
}) {
  const { colors } = useNookaTheme();
  const author = post.friend ? t(`friends.${post.friend}`) : t('feed.you');
  const caption = post.captionKey ? t(post.captionKey) : (post.caption ?? '');

  return (
    <View style={[styles.communityCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
      <View style={styles.communityAuthorRow}>
        <View style={[styles.communityAvatar, { backgroundColor: colors.avatarDefault }]} />
        <View style={styles.communityAuthorCopy}>
          <Text numberOfLines={1} style={[styles.communityAuthor, { color: colors.text }]}>{author}</Text>
          <Text style={[styles.communityTime, { color: colors.textMuted }]}>{t(post.timeKey)}</Text>
        </View>
      </View>
      <View accessible accessibilityLabel={caption} accessibilityRole="image">
        <Photo style={styles.communityPhoto} tint={SPOTS[post.spot].photoTint}>
          <View style={[styles.communityCaption, { backgroundColor: colors.photoScrim }]}>
            <Text style={[styles.communityCaptionText, { color: colors.captionText }]}>{caption}</Text>
          </View>
        </Photo>
      </View>
      <PostSocialActions onComment={() => onComment(post.id)} post={post} />
    </View>
  );
});

function CommunityEmpty() {
  const { colors } = useNookaTheme();
  return (
    <View style={[styles.communityEmpty, { backgroundColor: colors.surfaceMuted }]}>
      <Ionicons color={colors.textMuted} name="images-outline" size={24} />
      <Text style={[styles.communityEmptyText, { color: colors.textMuted }]}>{t('spot.communityEmpty')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 28 },
  hero: { height: HERO_HEIGHT },
  heroBar: { paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBadge: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  heroBadgeText: { fontSize: 12.5, lineHeight: 17, fontWeight: '700' },
  stickyBar: { borderTopWidth: 1, borderBottomWidth: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  identityRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10 },
  spotThumb: { width: 46, height: 46, borderRadius: 14 },
  identityCopy: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  name: { flex: 1, fontSize: 19, lineHeight: 25, fontWeight: '800', letterSpacing: -0.5 },
  district: { fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  meta: { marginTop: 1, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  actions: { marginTop: 10, flexDirection: 'row', gap: 8 },
  action: { flex: 1, minHeight: 44, paddingHorizontal: 9 },
  summary: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 4 },
  tags: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  review: { marginTop: 20, flexDirection: 'row', gap: 10 },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16 },
  reviewCopy: { flex: 1, minWidth: 0 },
  reviewWho: { fontSize: 13.5, lineHeight: 19, fontWeight: '700' },
  reviewWhen: { fontSize: 13.5, lineHeight: 19, fontWeight: '500' },
  reviewText: { marginTop: 4, fontSize: 13.5, lineHeight: 21, fontWeight: '500' },
  moreReviews: { marginTop: 12, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  noReview: { marginTop: 16, fontSize: 14, lineHeight: 22, fontWeight: '500' },
  writeOne: { marginTop: 13, alignSelf: 'flex-start' },
  friendLine: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  avatarStack: { flexDirection: 'row' },
  stackedAvatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
  friendText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  communityHeader: { marginTop: 28, marginHorizontal: 20, paddingTop: 22, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  communityHeadingCopy: { flex: 1, minWidth: 0 },
  communityCount: { marginTop: 3, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  publicBadge: { minHeight: 30, borderRadius: 999, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  publicBadgeText: { fontSize: 10.5, lineHeight: 14, fontWeight: '700' },
  privacyNote: { marginHorizontal: 20, marginTop: 12, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  privacyIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  privacyNoteText: { flex: 1, fontSize: 12.5, lineHeight: 18, fontWeight: '500' },
  communityCard: { marginHorizontal: 20, marginTop: 14, borderRadius: 22, borderWidth: 1, padding: 10 },
  communityAuthorRow: { minHeight: 42, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center', gap: 10 },
  communityAvatar: { width: 34, height: 34, borderRadius: 17 },
  communityAuthorCopy: { flex: 1, minWidth: 0 },
  communityAuthor: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  communityTime: { marginTop: 1, fontSize: 12, lineHeight: 16, fontWeight: '500' },
  communityPhoto: { width: '100%', aspectRatio: 0.86, marginTop: 8, borderRadius: 17 },
  communityCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingVertical: 13 },
  communityCaptionText: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  communityEmpty: { marginHorizontal: 20, marginTop: 14, minHeight: 132, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 10 },
  communityEmptyText: { textAlign: 'center', fontSize: 13.5, lineHeight: 21, fontWeight: '500' },
});
