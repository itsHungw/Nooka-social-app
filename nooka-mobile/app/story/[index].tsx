import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, DarkScreen, Photo } from '@/components/nooka/ui';
import { spotName } from '@/features/nooka/labels';
import { FRIENDS } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

/** Xem check-in của bạn bè từ dải trên đầu feed. "Tiếp" chạy vòng qua cả dải. */
export default function StoryScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const params = useLocalSearchParams<{ index: string }>();
  const start = Number(params.index);
  const [current, setCurrent] = useState(Number.isInteger(start) && start >= 0 && start < FRIENDS.length ? start : 0);

  const friend = FRIENDS[current];
  const name = t(`friends.${friend.id}`);

  return (
    <DarkScreen testID="story-screen">
      <View style={styles.header}>
        <Photo style={styles.avatar} tint={friend.tint} />
        <Text style={[styles.name, { color: colors.cameraText }]}>{name}</Text>
        <Text style={[styles.time, { color: colors.cameraTextMuted }]}>
          {t(friend.live ? 'time.justNow' : 'time.yesterday')}
        </Text>
        <Pressable
          accessibilityLabel={t('common.close')}
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}
          style={[styles.close, { backgroundColor: colors.cameraChip }]}>
          <Ionicons color={colors.cameraText} name="close" size={18} />
        </Pressable>
      </View>

      <Photo style={styles.photo} tint={friend.tint}>
        <View style={styles.captionAnchor}>
          <Text style={[styles.caption, { backgroundColor: colors.cameraOverlay, color: colors.cameraText }]}>
            {t(`story.${friend.id}`)}
          </Text>
        </View>
      </Photo>

      <View style={styles.actions}>
        <Button
          label={t('story.openSpot', { spot: spotName(friend.spot) })}
          onPress={() => router.replace({ pathname: '/spot/[id]', params: { id: friend.spot } })}
          style={styles.openSpot}
          tone="accent"
        />
        <Button
          label={t('story.next')}
          onPress={() => setCurrent((index) => (index + 1) % FRIENDS.length)}
          style={styles.next}
          tone="outline"
        />
      </View>
    </DarkScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  name: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  time: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  photo: { flex: 1, marginHorizontal: 16, borderRadius: 28 },
  captionAnchor: { position: 'absolute', left: 18, right: 18, bottom: 26, alignItems: 'center' },
  caption: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, flexDirection: 'row', gap: 8 },
  openSpot: { flex: 1, minHeight: 50, borderRadius: 16 },
  next: { minHeight: 50, borderRadius: 16, paddingHorizontal: 18 },
});
