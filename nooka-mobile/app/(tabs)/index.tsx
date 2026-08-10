import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { CommentSheet, PostSocialActions, PostVisibilityBadge } from '@/components/nooka/post-social';
import { PostAlbum } from '@/components/nooka/post-album';
import { AskNookaBar, Button, Chip, Photo, ScreenShell } from '@/components/nooka/ui';
import {
  formatDistance,
  spotDistrict,
  spotName,
  tagLabel,
  wantToGoAccessibilityLabel,
  wantToGoLabel,
} from '@/features/nooka/labels';
import { FRIENDS, PICKABLE_TAG_IDS, SPOTS, type FeedPost } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { useStartCheckin } from '@/hooks/use-start-checkin';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();
  const startCheckin = useStartCheckin();

  const [scrolled, setScrolled] = useState(false);
  const [journalVisible, setJournalVisible] = useState(true);
  const [cardHeight, setCardHeight] = useState(0);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const commentPost = demo.feed.find((post) => post.id === commentPostId) ?? null;

  const flatListRef = useRef<FlatList>(null);
  const lastY = useRef(0);
  const isScrollingDown = useRef(false);

  const animHeight = useSharedValue(1);

  const isStripShowing = !scrolled && journalVisible;

  useEffect(() => {
    animHeight.value = withTiming(isStripShowing ? 1 : 0, { duration: 250 });
  }, [isStripShowing, animHeight]);

  const animatedStripStyle = useAnimatedStyle(() => ({
    maxHeight: animHeight.value * 95,
    opacity: animHeight.value,
    transform: [{ translateY: (1 - animHeight.value) * -30 }],
    overflow: 'hidden',
  }));

  const animatedFeedAreaStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: animHeight.value * 88 }],
  }));

  const handleScrollBeginDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    if (isStripShowing && cardHeight > 0) {
      setJournalVisible(false);
      const currentPageIndex = Math.round(currentY / cardHeight);
      flatListRef.current?.scrollToOffset({ offset: currentPageIndex * cardHeight, animated: false });
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const dy = currentY - lastY.current;

    if (dy > 5) {
      isScrollingDown.current = true;
    } else if (dy < -5) {
      isScrollingDown.current = false;
    }

    // Dải Nhật ký chỉ thuộc đầu feed: vuốt lên là thu lại trước khi snap sang bài kế.
    if (isStripShowing && dy > 8 && cardHeight > 0) {
      setJournalVisible(false);
      const currentPageIndex = Math.round(currentY / cardHeight);
      flatListRef.current?.scrollToOffset({ offset: currentPageIndex * cardHeight, animated: false });
      lastY.current = currentY;
      return;
    }

    // Giữ Nhật ký ẩn giữa các bài; không dùng pill nổi vì nó che hàng tác giả.
    if (currentY > 40 && isScrollingDown.current) {
      if (!scrolled) {
        setScrolled(true);
      }
      setJournalVisible(false);
    }

    // Kéo xuống ở đầu feed thì dải Nhật ký xuất hiện lại.
    if (currentY <= 0 && dy < -5) {
      setScrolled(false);
      setJournalVisible(true);
    }

    lastY.current = currentY;
  };

  return (
    <ScreenShell testID="home-screen">
      <View style={styles.header}>
        <Text style={[styles.brand, { color: colors.text }]}>{t('brand.name')}</Text>
        <View style={styles.locationRow}>
          <View style={[styles.locationDot, { backgroundColor: colors.accentInk }]} />
          <Text style={[styles.locationText, { color: colors.text }]}>{t('home.location')}</Text>
        </View>
        <Pressable
          accessibilityLabel={t('home.avatarLabel')}
          accessibilityRole="button"
          onPress={() => router.push('/settings')}
          style={[styles.headerAvatar, { backgroundColor: colors.avatarDefault }]}
        />
      </View>

      <View style={[styles.searchBarWrapper, { backgroundColor: colors.background }]}>
        <AskNookaBar onPress={() => router.push('/ask')} />
      </View>

      <View style={styles.feedWrapper}>
        {!scrolled ? (
          <Animated.View style={[animatedStripStyle, styles.inlineStripOverlay]}>
            <JournalList
              onCheckin={startCheckin}
              onStory={(index) => router.push({ pathname: '/story/[index]', params: { index } })}
            />
          </Animated.View>
        ) : null}

        <Animated.View onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)} style={[styles.feedArea, animatedFeedAreaStyle]}>
          {demo.feed.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('home.emptyTitle')}</Text>
              <Text style={[styles.emptyBody, { color: colors.textMuted }]}>{t('home.emptyBody')}</Text>
              <Button label={t('home.emptyCta')} onPress={() => router.push('/ask')} style={styles.emptyCta} />
            </View>
          ) : (
            <FlatList
              data={demo.feed}
              decelerationRate="fast"
              keyExtractor={(post) => post.id}
              onScroll={handleScroll}
              onScrollBeginDrag={handleScrollBeginDrag}
              ref={flatListRef}
              renderItem={({ item }) => (
                <FeedCard height={cardHeight} onComment={() => setCommentPostId(item.id)} post={item} />
              )}
              ListFooterComponent={<CaughtUp height={cardHeight} />}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              snapToAlignment="start"
              snapToInterval={cardHeight || undefined}
            />
          )}
        </Animated.View>
      </View>

      <TagSheet />
      <CommentSheet post={commentPost} visible={Boolean(commentPost)} onClose={() => setCommentPostId(null)} />
    </ScreenShell>
  );
}

function FeedCard({ post, height, onComment }: { post: FeedPost; height: number; onComment: () => void }) {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();
  const spot = SPOTS[post.spot];
  const author = post.friend ? t(`friends.${post.friend}`) : t('feed.you');
  const caption = post.captionKey ? t(post.captionKey) : (post.caption ?? '');
  const wantsToGo = demo.wantsToGo(post.spot);
  const hasBeen = demo.isBeen(post.spot);
  const openSpot = () => router.push({ pathname: '/spot/[id]', params: { id: post.spot } });

  return (
    <View style={[styles.card, height ? { height } : null]}>
      <View style={styles.cardAuthor}>
        <View style={[styles.cardAvatar, { backgroundColor: colors.avatarDefault }]} />
        <View style={styles.cardAuthorCopy}>
          <Text numberOfLines={1} style={[styles.cardAuthorName, { color: colors.text }]}>{author}</Text>
          <Text numberOfLines={1} style={[styles.cardMeta, { color: colors.textMuted }]}>
            {t('home.postedBy', { time: t(post.timeKey) })}
          </Text>
        </View>
        {post.friend === null ? <PostVisibilityBadge visibility={post.visibility} /> : null}
        <Text style={[styles.cardMeta, styles.cardDistance, { color: colors.textMuted }]}>{formatDistance(spot.distanceM)}</Text>
      </View>

      <View style={styles.cardPhotoPress}>
        <PostAlbum photos={post.photoTints} caption={caption} onOpenSpot={openSpot} />
      </View>

      {post.hashtagsKey || post.hashtags?.length ? (
        <Pressable
          accessibilityLabel={t('feed.searchHashtag')}
          accessibilityRole="button"
          onPress={() => {
            const firstHashtag = post.hashtags?.[0];
            demo.setQuery(firstHashtag ? `#${firstHashtag}` : t(post.hashtagsKey!));
            router.push('/(tabs)/search');
          }}>
          <Text numberOfLines={1} style={[styles.hashtags, { color: colors.accentInk }]}>
            {post.hashtags?.length ? post.hashtags.map((hashtag) => `#${hashtag}`).join(' ') : t(post.hashtagsKey!)}
          </Text>
        </Pressable>
      ) : null}

      <View style={[styles.postActions, { borderColor: colors.borderSubtle }]}>
        <PostSocialActions onComment={onComment} post={post} />
      </View>

      <View style={[styles.spotAttachment, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderSubtle }]}>
        <Pressable
          accessibilityLabel={t('feed.openSpot', { spot: spotName(post.spot) })}
          accessibilityRole="button"
          onPress={openSpot}
          style={({ pressed }) => [styles.spotAttachmentCopy, { opacity: pressed ? 0.7 : 1 }]}>
          <View style={styles.spotAttachmentTitleRow}>
            <Text numberOfLines={1} style={[styles.cardSpotName, { color: colors.text }]}>{spotName(post.spot)}</Text>
            <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
          </View>
          <Text numberOfLines={1} style={[styles.spotAttachmentMeta, { color: colors.textMuted }]}>
            {[spotDistrict(post.spot), ...post.tags.slice(0, 2).map(tagLabel)].join(' · ')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={wantToGoAccessibilityLabel(hasBeen, wantsToGo)}
          accessibilityRole="button"
          accessibilityState={{ selected: wantsToGo }}
          onPress={() => demo.toggleWantToGo(post.spot)}
          style={({ pressed }) => [
            styles.wantButton,
            {
              backgroundColor: wantsToGo ? colors.accentSoft : colors.inverseSurface,
              borderColor: wantsToGo ? colors.accentSoft : colors.inverseSurface,
              opacity: pressed ? 0.76 : 1,
            },
          ]}>
          <Ionicons
            color={wantsToGo ? colors.accentInk : colors.onInverse}
            name={wantsToGo ? 'bookmark' : 'bookmark-outline'}
            size={17}
          />
          <Text
            numberOfLines={1}
            style={[styles.wantButtonLabel, { color: wantsToGo ? colors.accentInk : colors.onInverse }]}>
            {wantToGoLabel(hasBeen, wantsToGo)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function CaughtUp({ height }: { height: number }) {
  const router = useRouter();
  const { colors } = useNookaTheme();

  return (
    <View style={[styles.caughtUp, height ? { height } : null]}>
      <View style={[styles.caughtIcon, { backgroundColor: colors.accentSoft }]}>
        <Ionicons color={colors.accentInk} name="checkmark" size={24} />
      </View>
      <Text style={[styles.caughtTitle, { color: colors.text }]}>{t('home.caughtUp.title')}</Text>
      <Text style={[styles.caughtBody, { color: colors.textMuted }]}>{t('home.caughtUp.body')}</Text>
      <View style={styles.suggestionRow}>
        {FRIENDS.slice(0, 3).map((friend) => (
          <View key={friend.id} style={styles.suggestion}>
            <Photo style={styles.suggestionAvatar} tint={friend.tint} />
            <Text numberOfLines={1} style={[styles.suggestionName, { color: colors.text }]}>{t(`friends.${friend.id}`)}</Text>
            <Text numberOfLines={1} style={[styles.suggestionReason, { color: colors.textMuted }]}>
              {t('home.caughtUp.sameCity')}
            </Text>
          </View>
        ))}
      </View>
      <Button label={t('home.caughtUp.seePeople')} onPress={() => router.push('/add-friends')} style={styles.caughtButton} />
    </View>
  );
}

/** Sheet "Đã lên feed": chọn tag cho bài vừa đăng, hoặc đi thẳng sang review. */
function TagSheet() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();
  const post = demo.feed.find((item) => item.id === demo.sheetPostId);
  const asksToKeepForRevisit = Boolean(post && demo.visitIntentPromptSpot === post.spot);

  return (
    <Modal animationType="slide" onRequestClose={demo.commitSheetTags} transparent visible={Boolean(post)}>
      <View style={[styles.sheetScrim, { backgroundColor: colors.scrim }]}>
        <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.sheetGrip, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('sheet.title')}</Text>
          <Text style={[styles.sheetBody, { color: colors.textMuted }]}>{t('sheet.body')}</Text>
          <View style={styles.sheetTags}>
            {PICKABLE_TAG_IDS.map((tag) => (
              <Chip
                key={tag}
                label={tagLabel(tag)}
                onPress={() => demo.toggleSheetTag(tag)}
                selected={demo.sheetTags.includes(tag)}
              />
            ))}
          </View>
          {asksToKeepForRevisit ? (
            <View style={[styles.revisitPrompt, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.revisitTitle, { color: colors.text }]}>{t('sheet.revisitTitle')}</Text>
              <Text style={[styles.revisitBody, { color: colors.textMuted }]}>
                {t('sheet.revisitBody', { spot: spotName(post!.spot) })}
              </Text>
              <View style={styles.revisitActions}>
                <Button
                  label={t('sheet.keepForRevisit')}
                  onPress={demo.keepWantToGoForRevisit}
                  style={styles.revisitAction}
                />
                <Button
                  label={t('sheet.removeWantToGo')}
                  onPress={demo.removeCompletedWantToGo}
                  style={styles.revisitAction}
                  tone="outline"
                />
              </View>
            </View>
          ) : null}
          <View style={styles.sheetActions}>
            <Button label={t('common.done')} onPress={demo.commitSheetTags} style={styles.sheetPrimary} />
            <Button
              label={t('sheet.writeReview')}
              onPress={() => {
                const spot = post?.spot ?? demo.reviewSpot;
                demo.commitSheetTags();
                demo.openReviewFor(spot);
                router.push('/review');
              }}
              tone="outline"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Danh sách Nhật ký cuộn ngang, không ô viền bao quanh */
function JournalList({ onCheckin, onStory }: { onCheckin: () => void; onStory: (index: number) => void }) {
  const { colors } = useNookaTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.stripScroll}
      horizontal
      showsHorizontalScrollIndicator={false}>
      <Pressable accessibilityLabel={t('home.checkin')} accessibilityRole="button" onPress={onCheckin} style={styles.stripItem}>
        <View style={[styles.stripCircle, styles.stripAdd, { backgroundColor: colors.inverseSurface }]}>
          <Ionicons color={colors.onInverse} name="add" size={22} />
        </View>
        <Text numberOfLines={1} style={[styles.stripLabel, { color: colors.textMuted }]}>{t('home.checkin')}</Text>
      </Pressable>
      {FRIENDS.map((friend, index) => (
        <Pressable
          accessibilityLabel={t(`friends.${friend.id}`)}
          accessibilityRole="button"
          key={friend.id}
          onPress={() => onStory(index)}
          style={styles.stripItem}>
          <Photo
            style={[styles.stripCircle, { borderWidth: friend.live ? 2.5 : 0, borderColor: colors.accentStrong }]}
            tint={friend.tint}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.stripLabel,
              { color: friend.live ? colors.text : colors.textMuted, fontWeight: friend.live ? '700' : '600' },
            ]}>
            {t(`friends.${friend.id}`)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 44, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { flex: 1, fontSize: 25, lineHeight: 32, fontWeight: '800', letterSpacing: -0.7 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  locationDot: { width: 6, height: 6, borderRadius: 3 },
  locationText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  headerAvatar: { width: 30, height: 30, borderRadius: 15 },
  stripScroll: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  stripItem: { width: 56, alignItems: 'center', gap: 5 },
  stripCircle: { width: 52, height: 52, borderRadius: 26 },
  stripAdd: { alignItems: 'center', justifyContent: 'center' },
  stripLabel: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
  searchBarWrapper: { zIndex: 100 },
  feedWrapper: { flex: 1, position: 'relative', overflow: 'hidden', zIndex: 1 },
  inlineStripOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  feedArea: { flex: 1, paddingHorizontal: 20 },
  empty: { paddingTop: 22 },
  emptyTitle: { fontSize: 19, lineHeight: 26, fontWeight: '800', letterSpacing: -0.4 },
  emptyBody: { marginTop: 8, fontSize: 14, lineHeight: 22, fontWeight: '500' },
  emptyCta: { marginTop: 16, alignSelf: 'flex-start' },
  card: { paddingTop: 12, paddingBottom: 6 },
  cardAuthor: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardAvatar: { width: 30, height: 30, borderRadius: 15 },
  cardAuthorCopy: { flex: 1, minWidth: 0 },
  cardAuthorName: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  cardMeta: { fontSize: 12.5, lineHeight: 17, fontWeight: '500' },
  cardDistance: { marginLeft: 8 },
  cardPhotoPress: { flex: 1, minHeight: 150, marginTop: 10 },
  cardSpotName: { flex: 1, fontSize: 15.5, lineHeight: 21, fontWeight: '700', letterSpacing: -0.3 },
  hashtags: { marginTop: 9, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caughtUp: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 30 },
  caughtIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  caughtTitle: { marginTop: 14, fontSize: 20, lineHeight: 27, fontWeight: '800', letterSpacing: -0.4 },
  caughtBody: { maxWidth: 300, marginTop: 7, textAlign: 'center', fontSize: 13.5, lineHeight: 20, fontWeight: '500' },
  suggestionRow: { width: '100%', marginTop: 24, flexDirection: 'row', justifyContent: 'center', gap: 18 },
  suggestion: { width: 82, alignItems: 'center' },
  suggestionAvatar: { width: 52, height: 52, borderRadius: 26 },
  suggestionName: { width: '100%', marginTop: 7, textAlign: 'center', fontSize: 12.5, lineHeight: 17, fontWeight: '700' },
  suggestionReason: { width: '100%', marginTop: 1, textAlign: 'center', fontSize: 10.5, lineHeight: 14, fontWeight: '500' },
  caughtButton: { marginTop: 22, minWidth: 180 },
  postActions: { marginTop: 8, minHeight: 48, flexDirection: 'row', borderBottomWidth: 1 },
  spotAttachment: {
    marginTop: 10,
    minHeight: 68,
    borderRadius: 17,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  spotAttachmentCopy: { flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center' },
  spotAttachmentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  spotAttachmentMeta: { marginTop: 2, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  wantButton: {
    minHeight: 44,
    maxWidth: 124,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  wantButtonLabel: { flexShrink: 1, fontSize: 12.5, lineHeight: 17, fontWeight: '700' },
  sheetScrim: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 30 },
  sheetGrip: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.4 },
  sheetBody: { marginTop: 7, fontSize: 14, lineHeight: 22, fontWeight: '500' },
  sheetTags: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  revisitPrompt: { marginTop: 16, borderRadius: 18, borderWidth: 1, padding: 14 },
  revisitTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  revisitBody: { marginTop: 4, fontSize: 13, lineHeight: 19, fontWeight: '500' },
  revisitActions: { marginTop: 12, flexDirection: 'row', gap: 8 },
  revisitAction: { flex: 1 },
  sheetActions: { marginTop: 18, flexDirection: 'row', gap: 8 },
  sheetPrimary: { flex: 1, minHeight: 50 },
});
