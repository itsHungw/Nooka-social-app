import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { IconButton, ScreenShell } from '@/components/nooka/ui';
import { profile, profilePosts } from '@/features/nooka/prototype-data';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors } = useNookaTheme();
  const gridWidth = Math.min(width, 560) - 36;
  const tileSize = Math.floor((gridWidth - 4) / 3);
  const stats = [
    { value: profile.postCount, label: t('profile.posts') },
    { value: profile.followerCount, label: t('profile.followers') },
    { value: profile.followingCount, label: t('profile.following') },
  ];

  return (
    <ScreenShell contentContainerStyle={styles.page} testID="profile-screen">
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text numberOfLines={1} style={[styles.username, { color: colors.text }]}>{t(profile.usernameKey)}</Text>
          <Text style={[styles.brandLabel, { color: colors.textMuted }]}>{t('brand.name')}</Text>
        </View>
        <IconButton
          accessibilityLabel={t('profile.menu')}
          icon="menu-outline"
          onPress={() => router.push('/settings')}
        />
      </View>

      <View style={styles.identityRow}>
        <View style={[styles.avatarRing, { borderColor: colors.accent }]}> 
          <View style={[styles.avatar, { backgroundColor: colors.mint }]}> 
            <Text style={[styles.avatarInitials, { color: colors.text }]}>{profile.avatarInitials}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
              <Text numberOfLines={1} style={[styles.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bioBlock}>
        <Text style={[styles.displayName, { color: colors.text }]}>{t(profile.displayNameKey)}</Text>
        <Text style={[styles.bio, { color: colors.textMuted }]}>{t(profile.bioKey)}</Text>
      </View>

      <View style={[styles.postsHeader, { borderColor: colors.border }]}> 
        <View style={[styles.postsTab, { borderColor: colors.text }]}> 
          <Ionicons color={colors.text} name="grid-outline" size={18} />
          <Text style={[styles.postsLabel, { color: colors.text }]}>{t('profile.posts')}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {profilePosts.map((post) => (
          <Pressable
            accessibilityLabel={t(post.placeNameKey)}
            accessibilityRole="button"
            key={post.id}
            onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
            style={({ pressed }) => [
              styles.tile,
              { width: tileSize, height: tileSize, backgroundColor: colors.imageFallback, opacity: pressed ? 0.78 : 1 },
            ]}>
            <Image contentFit="cover" source={post.image} style={StyleSheet.absoluteFill} transition={150} />
            <View style={[styles.tileBadge, { backgroundColor: colors.overlay }]}> 
              <Ionicons color={colors.surface} name="location" size={12} />
            </View>
          </Pressable>
        ))}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: 8 },
  titleRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  titleCopy: { flex: 1, minWidth: 0 },
  username: { fontSize: 23, lineHeight: 29, fontWeight: '800' },
  brandLabel: { marginTop: 1, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  identityRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 18 },
  avatarRing: { width: 86, height: 86, borderRadius: 43, borderWidth: 2, padding: 4 },
  avatar: { flex: 1, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  statsRow: { flex: 1, minWidth: 0, flexDirection: 'row' },
  stat: { flex: 1, minWidth: 0, alignItems: 'center' },
  statValue: { fontSize: 18, lineHeight: 24, fontWeight: '800' },
  statLabel: { marginTop: 2, fontSize: 10, lineHeight: 14, fontWeight: '500' },
  bioBlock: { marginTop: 14, gap: 4 },
  displayName: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  bio: { maxWidth: 340, fontSize: 12, lineHeight: 18 },
  postsHeader: { marginTop: 18, height: 48, borderTopWidth: 1, alignItems: 'center' },
  postsTab: { height: 48, minWidth: 104, borderBottomWidth: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  postsLabel: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  tile: { position: 'relative', overflow: 'hidden' },
  tileBadge: { position: 'absolute', right: 6, top: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', opacity: 0.84 },
});
