import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, ScreenShell, SectionLabel, SpotRow } from '@/components/nooka/ui';
import { spotDistrict, spotName, tagLabel } from '@/features/nooka/labels';
import { spotTags } from '@/features/nooka/ranking';
import { SPOTS, type SpotId } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

export default function SavedScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();
  const firstVisits = demo.wantToGo.filter((id) => !demo.isBeen(id));
  const returnVisits = demo.wantToGo.filter((id) => demo.isBeen(id));

  const renderSpot = (id: SpotId, returning: boolean) => (
    <SpotRow
      key={id}
      line={[spotDistrict(id), ...spotTags(id, demo.extraTags).slice(0, 2).map((tag) => tagLabel(tag.id))].join(' · ')}
      onPress={() => router.push({ pathname: '/spot/[id]', params: { id } })}
      radius={16}
      square={56}
      tint={SPOTS[id].photoTint}
      title={spotName(id)}
      trailing={(
        <View style={[styles.statusBadge, { backgroundColor: returning ? colors.accentSoft : colors.surfaceMuted }]}>
          <Text style={[styles.statusBadgeText, { color: returning ? colors.accentInk : colors.textMuted }]}>
            {returning ? t('saved.returnBadge') : t('saved.firstVisitBadge')}
          </Text>
        </View>
      )}
    />
  );

  return (
    <ScreenShell testID="saved-screen">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('saved.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {demo.wantToGo.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={[styles.empty, { color: colors.textMuted }]}>{t('saved.empty')}</Text>
            <Button label={t('saved.explore')} onPress={() => router.push('/(tabs)/search')} style={styles.emptyButton} />
          </View>
        ) : (
          <>
            {firstVisits.length > 0 ? (
              <View style={styles.section}>
                <SectionLabel>{t('saved.firstVisitTitle')}</SectionLabel>
                <Text style={[styles.sectionBody, { color: colors.textMuted }]}>{t('saved.firstVisitBody')}</Text>
                <View style={styles.rows}>{firstVisits.map((id) => renderSpot(id, false))}</View>
              </View>
            ) : null}
            {returnVisits.length > 0 ? (
              <View style={styles.section}>
                <SectionLabel>{t('saved.returnTitle')}</SectionLabel>
                <Text style={[styles.sectionBody, { color: colors.textMuted }]}>{t('saved.returnBody')}</Text>
                <View style={styles.rows}>{returnVisits.map((id) => renderSpot(id, true))}</View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 44, paddingHorizontal: 20, justifyContent: 'center' },
  title: { fontSize: 25, lineHeight: 32, fontWeight: '800', letterSpacing: -0.7 },
  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 24 },
  section: { gap: 6 },
  sectionBody: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  rows: { marginTop: 5, gap: 4 },
  statusBadge: { minHeight: 28, borderRadius: 999, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  statusBadgeText: { fontSize: 10.5, lineHeight: 14, fontWeight: '700' },
  emptyCard: { borderRadius: 20, padding: 18 },
  empty: { fontSize: 14, lineHeight: 22, fontWeight: '500' },
  emptyButton: { marginTop: 14, alignSelf: 'flex-start' },
});
