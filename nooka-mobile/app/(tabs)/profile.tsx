import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Photo, ScreenShell, SectionLabel, SpotRow } from '@/components/nooka/ui';
import { formatDistance, spotDistrict, spotName } from '@/features/nooka/labels';
import { SPOTS } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const { saved, been, myPosts } = useNookaDemo();

  const stats = [
    { key: 'checkins', value: myPosts.length },
    { key: 'been', value: been.length },
    { key: 'saved', value: saved.length },
  ] as const;

  return (
    <ScreenShell testID="profile-screen">
      <Pressable
        accessibilityLabel={t('navigation.settings')}
        accessibilityRole="button"
        onPress={() => router.push('/settings')}
        style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.avatarDefault }]} />
        <View>
          <Text style={[styles.name, { color: colors.text }]}>{t('profile.title')}</Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>{t('profile.meta')}</Text>
        </View>
      </Pressable>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.stats}>
          {stats.map((stat) => (
            <View key={stat.key} style={[styles.statCard, { backgroundColor: colors.surfaceMuted }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{String(stat.value)}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t(`profile.stats.${stat.key}`)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <SectionLabel>{t('profile.yourCheckins')}</SectionLabel>
        </View>
        {myPosts.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>{t('profile.noCheckins')}</Text>
        ) : (
          <View style={styles.grid}>
            {myPosts.map((post) => (
              <Pressable
                accessibilityLabel={spotName(post.spot)}
                accessibilityRole="button"
                key={post.id}
                onPress={() => router.push({ pathname: '/spot/[id]', params: { id: post.spot } })}
                style={styles.gridCell}>
                <Photo style={styles.gridPhoto} tint={SPOTS[post.spot].photoTint} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <SectionLabel>{t('profile.beenPlaces')}</SectionLabel>
        </View>
        {been.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>{t('profile.noBeen')}</Text>
        ) : (
          been.map((id) => (
            <SpotRow
              key={id}
              line={`${spotDistrict(id)} · ${formatDistance(SPOTS[id].distanceM)}`}
              onPress={() => router.push({ pathname: '/spot/[id]', params: { id: id } })}
              tint={SPOTS[id].photoTint}
              title={spotName(id)}
            />
          ))
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 4, flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  name: { fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.4 },
  meta: { marginTop: 3, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  body: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 },
  stats: { flexDirection: 'row', gap: 9 },
  statCard: { flex: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 13 },
  statValue: { fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.7 },
  statLabel: { marginTop: 4, fontSize: 11.5, lineHeight: 15, fontWeight: '600' },
  section: { marginTop: 22, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridCell: { width: '32%' },
  gridPhoto: { height: 104, borderRadius: 12 },
  empty: { fontSize: 13.5, lineHeight: 21, fontWeight: '500' },
});
