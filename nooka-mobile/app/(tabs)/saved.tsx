import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenShell, SpotRow } from '@/components/nooka/ui';
import { spotDistrict, spotName, tagLabel } from '@/features/nooka/labels';
import { spotTags } from '@/features/nooka/ranking';
import { SPOTS } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

export default function SavedScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const { wantToGo, extraTags } = useNookaDemo();

  return (
    <ScreenShell testID="saved-screen">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('saved.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {wantToGo.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>{t('saved.empty')}</Text>
        ) : (
          wantToGo.map((id) => (
            <SpotRow
              key={id}
              line={[spotDistrict(id), ...spotTags(id, extraTags).slice(0, 2).map((tag) => tagLabel(tag.id))].join(' · ')}
              onPress={() => router.push({ pathname: '/spot/[id]', params: { id: id } })}
              radius={16}
              square={56}
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
  header: { minHeight: 44, paddingHorizontal: 20, justifyContent: 'center' },
  title: { fontSize: 25, lineHeight: 32, fontWeight: '800', letterSpacing: -0.7 },
  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 9 },
  empty: { fontSize: 14, lineHeight: 22, fontWeight: '500' },
});
