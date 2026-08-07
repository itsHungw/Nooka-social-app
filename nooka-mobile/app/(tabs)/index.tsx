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

import { AskNookaBar, Button, Chip, Photo, ScreenShell } from '@/components/nooka/ui';
import { formatDistance, spotDistrict, spotName, tagLabel } from '@/features/nooka/labels';
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
  const [stripOpen, setStripOpen] = useState(false);
  const [cardHeight, setCardHeight] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const lastY = useRef(0);
  const isScrollingDown = useRef(false);

  const animHeight = useSharedValue(1);

  const isStripShowing = scrolled ? stripOpen : journalVisible;

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
      setStripOpen(false);
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

    // TikTok Rule: If Journal is open (either page 1 or overlay page 2+) and user swipes UP to scroll down
    if (isStripShowing && dy > 8 && cardHeight > 0) {
      setJournalVisible(false);
      setStripOpen(false);
      const currentPageIndex = Math.round(currentY / cardHeight);
      flatListRef.current?.scrollToOffset({ offset: currentPageIndex * cardHeight, animated: false });
      lastY.current = currentY;
      return;
    }

    // TikTok Rule 2 & 3: When scrolling down past page 1, close journal strip and keep it hidden on scroll up between pages 2, 3...
    if (currentY > 40 && isScrollingDown.current) {
      if (!scrolled) {
        setScrolled(true);
      }
      setJournalVisible(false);
      setStripOpen(false);
    }

    // TikTok Rule 4: Pull down at top of page 1 to re-open/show journal strip
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

        {scrolled ? (
          <View style={styles.stripOverlayContainer}>
            <Animated.View style={[animatedStripStyle, styles.stripOverlayCard]}>
              <JournalList
                onCheckin={startCheckin}
                onStory={(index) => router.push({ pathname: '/story/[index]', params: { index } })}
              />
            </Animated.View>

            <View style={styles.stripToggleRow}>
              <Chip
                label={stripOpen ? t('home.journalOpen') : t('home.journalClosed')}
                onPress={() => setStripOpen((open) => !open)}
              />
            </View>
          </View>
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
              renderItem={({ item }) => <FeedCard height={cardHeight} post={item} />}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              snapToAlignment="start"
              snapToInterval={cardHeight || undefined}
            />
          )}
        </Animated.View>
      </View>

      <TagSheet />
    </ScreenShell>
  );
}

function FeedCard({ post, height }: { post: FeedPost; height: number }) {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();
  const spot = SPOTS[post.spot];
  const author = post.friend ? t(`friends.${post.friend}`) : t('feed.you');
  const caption = post.captionKey ? t(post.captionKey) : (post.caption ?? '');
  const openSpot = () => router.push({ pathname: '/spot/[id]', params: { id: post.spot } });

  return (
    <View style={[styles.card, height ? { height } : null]}>
      <View style={styles.cardAuthor}>
        <View style={[styles.cardAvatar, { backgroundColor: colors.avatarDefault }]} />
        <Text style={[styles.cardAuthorName, { color: colors.text }]}>{author}</Text>
        <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
          {t('home.postedBy', { time: t(post.timeKey) })}
        </Text>
        <Text style={[styles.cardMeta, styles.cardDistance, { color: colors.textMuted }]}>
          {formatDistance(spot.distanceM)}
        </Text>
      </View>

      <Pressable accessibilityLabel={caption} accessibilityRole="button" onPress={openSpot} style={styles.cardPhotoPress}>
        <Photo style={styles.cardPhoto} tint={spot.photoTint}>
          <View style={[styles.photoBadge, { backgroundColor: colors.background }]}>
            <Text style={[styles.photoBadgeText, { color: colors.textMuted }]}>{t('home.photoBadge')}</Text>
          </View>
          <View style={[styles.captionBand, { backgroundColor: colors.photoScrim }]}>
            <Text style={[styles.captionText, { color: colors.captionText }]}>{caption}</Text>
          </View>
        </Photo>
      </Pressable>

      <Pressable accessibilityLabel={spotName(post.spot)} accessibilityRole="button" onPress={openSpot} style={styles.cardSpotRow}>
        <Text numberOfLines={1} style={[styles.cardSpotName, { color: colors.text }]}>{spotName(post.spot)}</Text>
        <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{spotDistrict(post.spot)}</Text>
      </Pressable>

      {post.tags.length ? (
        <View style={styles.cardTags}>
          {post.tags.map((tag) => (
            <Chip key={tag} label={tagLabel(tag)} />
          ))}
        </View>
      ) : null}

      {post.hashtagsKey ? (
        <Text style={[styles.hashtags, { color: colors.accentInk }]}>{t(post.hashtagsKey)}</Text>
      ) : null}

      <View style={styles.cardActions}>
        <Button
          label={demo.isSaved(post.spot) ? t('actions.saved') : t('actions.want')}
          onPress={() => demo.toggleSave(post.spot)}
          style={styles.cardAction}
          tone={demo.isSaved(post.spot) ? 'soft' : 'primary'}
        />
        <Button
          label={demo.isBeen(post.spot) ? t('actions.beenDone') : t('actions.been')}
          onPress={() => demo.toggleBeen(post.spot)}
          style={styles.cardAction}
          tone={demo.isBeen(post.spot) ? 'soft' : 'outline'}
        />
        <Button
          label={t('actions.ask')}
          onPress={() => demo.flash(t('toast.asked', { name: author }))}
          style={styles.cardAction}
          tone="outline"
        />
      </View>
    </View>
  );
}

/** Sheet "Đã lên feed": chọn tag cho bài vừa đăng, hoặc đi thẳng sang review. */
function TagSheet() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();
  const post = demo.feed.find((item) => item.id === demo.sheetPostId);

  return (
    <Modal animationType="slide" onRequestClose={demo.commitSheetTags} transparent visible={Boolean(post)}>
      <View style={[styles.sheetScrim, { backgroundColor: colors.scrim }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
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
  stripToggleRow: { alignItems: 'center', paddingVertical: 4, zIndex: 25 },
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
  stripOverlayContainer: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
    gap: 4,
  },
  stripOverlayCard: {
    width: '100%',
  },
  feedArea: { flex: 1, paddingHorizontal: 20 },
  empty: { paddingTop: 22 },
  emptyTitle: { fontSize: 19, lineHeight: 26, fontWeight: '800', letterSpacing: -0.4 },
  emptyBody: { marginTop: 8, fontSize: 14, lineHeight: 22, fontWeight: '500' },
  emptyCta: { marginTop: 16, alignSelf: 'flex-start' },
  card: { paddingTop: 12, paddingBottom: 6 },
  cardAuthor: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  cardAvatar: { width: 30, height: 30, borderRadius: 15 },
  cardAuthorName: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  cardMeta: { fontSize: 12.5, lineHeight: 17, fontWeight: '500' },
  cardDistance: { marginLeft: 'auto' },
  cardPhotoPress: { flex: 1, minHeight: 150, marginTop: 10 },
  cardPhoto: { flex: 1, borderRadius: 20 },
  photoBadge: { position: 'absolute', left: 12, top: 12, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  photoBadgeText: { fontSize: 10, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' },
  captionBand: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingVertical: 15 },
  captionText: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  cardSpotRow: { marginTop: 14, flexDirection: 'row', alignItems: 'baseline', gap: 9 },
  cardSpotName: { flex: 1, fontSize: 18, lineHeight: 24, fontWeight: '800', letterSpacing: -0.4 },
  cardTags: { marginTop: 9, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  hashtags: { marginTop: 9, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  cardActions: { marginTop: 14, flexDirection: 'row', gap: 8 },
  cardAction: { flex: 1 },
  sheetScrim: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 30 },
  sheetGrip: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.4 },
  sheetBody: { marginTop: 7, fontSize: 14, lineHeight: 22, fontWeight: '500' },
  sheetTags: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  sheetActions: { marginTop: 18, flexDirection: 'row', gap: 8 },
  sheetPrimary: { flex: 1, minHeight: 50 },
});
