import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton, ScreenShell } from '@/components/nooka/ui';
import { profilePosts } from '@/features/nooka/prototype-data';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

export default function PostPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { colors } = useNookaTheme();
  const [saved, setSaved] = useState(true);
  const postId = Array.isArray(params.id) ? params.id[0] : params.id;
  const post = profilePosts.find((item) => item.id === postId);

  return (
    <ScreenShell testID="post-preview-screen">
      <View style={styles.header}>
        <IconButton accessibilityLabel={t('common.back')} icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.title, { color: colors.text }]}>{t('post.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {post ? (
        <>
          <View style={[styles.imageFrame, { backgroundColor: colors.imageFallback }]}> 
            <Image
              accessibilityLabel={t(post.placeNameKey)}
              contentFit="cover"
              source={post.image}
              style={StyleSheet.absoluteFill}
              transition={180}
            />
          </View>
          <View style={styles.details}>
            <View style={styles.placeCopy}>
              <Text style={[styles.placeName, { color: colors.text }]}>{t(post.placeNameKey)}</Text>
              <View style={styles.timeRow}>
                <Ionicons color={colors.mintStrong} name="location-outline" size={15} />
                <Text style={[styles.postedAt, { color: colors.textMuted }]}>{t(post.postedAtKey)}</Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel={t('navigation.saved')}
              accessibilityRole="button"
              accessibilityState={{ selected: saved }}
              onPress={() => setSaved((value) => !value)}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: saved ? colors.accent : colors.surface, borderColor: saved ? colors.accent : colors.border, opacity: pressed ? 0.72 : 1 },
              ]}>
              <Ionicons color={saved ? colors.onAccent : colors.icon} name={saved ? 'bookmark' : 'bookmark-outline'} size={20} />
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.notFound}>
          <View style={[styles.notFoundIcon, { backgroundColor: colors.surfaceMuted }]}> 
            <Ionicons color={colors.icon} name="images-outline" size={28} />
          </View>
          <Text style={[styles.notFoundText, { color: colors.text }]}>{t('post.notFound')}</Text>
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '800' },
  headerSpacer: { width: 38, height: 38 },
  imageFrame: { width: '100%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden' },
  details: { minHeight: 76, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  placeCopy: { flex: 1, minWidth: 0 },
  placeName: { fontSize: 18, lineHeight: 24, fontWeight: '800' },
  timeRow: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  postedAt: { fontSize: 12, lineHeight: 16 },
  saveButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  notFoundIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { marginTop: 14, textAlign: 'center', fontSize: 15, lineHeight: 22, fontWeight: '600' },
});
