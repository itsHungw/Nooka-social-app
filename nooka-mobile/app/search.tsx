import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, CircleButton, Photo, ScreenShell } from '@/components/nooka/ui';
import { formatDistance, spotName, tagLabel, tagSynonyms } from '@/features/nooka/labels';
import { explainTags, matchTags, rankSpots } from '@/features/nooka/ranking';
import { INTENT_IDS, SPOTS, TAG_IDS, type SpotId, type TagId } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();

  const matched = useMemo(
    () => matchTags(demo.query, tagSynonyms(TAG_IDS), demo.intent),
    [demo.query, demo.intent],
  );
  const results = demo.answered ? rankSpots(matched, demo.extraTags) : [];

  return (
    <ScreenShell testID="search-screen">
      <View style={styles.header}>
        <CircleButton accessibilityLabel={t('common.back')} icon="arrow-back" onPress={() => router.back()} tone="muted" />
        <Text style={[styles.title, { color: colors.text }]}>{t('search.title')}</Text>
      </View>

      <View style={[styles.panel, { backgroundColor: colors.inverseSurface }]}>
        <Text style={[styles.prompt, { color: colors.onInverse }]}>{t('search.prompt')}</Text>

        <View style={[styles.field, { backgroundColor: colors.surfaceMuted }]}>
          <View style={[styles.fieldDot, { borderColor: colors.accent }]} />
          <TextInput
            accessibilityLabel={t('search.placeholder')}
            onChangeText={demo.setQuery}
            onSubmitEditing={demo.ask}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.textSubtle}
            returnKeyType="search"
            style={[styles.input, { color: colors.text }]}
            value={demo.query}
          />
        </View>

        <View style={styles.intents}>
          {INTENT_IDS.map((intent) => {
            const selected = demo.intent === intent;
            return (
              <Pressable
                accessibilityLabel={t(`search.intents.${intent}`)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={intent}
                onPress={() => demo.pickIntent(intent)}
                style={({ pressed }) => [
                  styles.intent,
                  { backgroundColor: selected ? colors.accent : colors.surfaceMuted, opacity: pressed ? 0.75 : 1 },
                ]}>
                <Text style={[styles.intentLabel, { color: selected ? colors.onAccent : colors.text }]}>
                  {t(`search.intents.${intent}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Button label={t('search.cta')} onPress={demo.ask} style={styles.cta} tone="accent" />
      </View>

      <ScrollView contentContainerStyle={styles.results} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lead, { color: colors.textMuted }]}>
          {demo.answered ? t('search.answerLine', { count: results.length }) : t('search.noAnswer')}
        </Text>
        {results.map((id, index) => (
          <ResultRow key={id} matched={matched} rank={index + 1} spot={id} />
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

function ResultRow({ spot, rank, matched }: { spot: SpotId; rank: number; matched: TagId[] }) {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const { extraTags } = useNookaDemo();
  const tags = explainTags(spot, matched, extraTags);
  const top = tags[0];
  const detail = SPOTS[spot];

  const reason = detail.checkins <= 1
    ? t('search.reasonNew')
    : detail.friends > 0
      ? t('search.reasonWithFriends', { count: top.count, tag: tagLabel(top.id).toLowerCase(), friends: detail.friends })
      : t('search.reason', { count: top.count, tag: tagLabel(top.id).toLowerCase() });

  return (
    <Pressable
      accessibilityLabel={spotName(spot)}
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/spot/[id]', params: { id: spot } })}
      style={({ pressed }) => [styles.result, { opacity: pressed ? 0.7 : 1 }]}>
      <View>
        <Photo style={styles.resultPhoto} tint={detail.photoTint} />
        <View style={[styles.rank, { backgroundColor: rank === 1 ? colors.accent : colors.surfaceMuted }]}>
          <Text style={[styles.rankText, { color: colors.text }]}>{String(rank)}</Text>
        </View>
      </View>
      <View style={styles.resultCopy}>
        <View style={styles.resultTitleRow}>
          <Text numberOfLines={1} style={[styles.resultName, { color: colors.text }]}>{spotName(spot)}</Text>
          <Text style={[styles.resultDistance, { color: colors.textMuted }]}>{formatDistance(detail.distanceM)}</Text>
        </View>
        <Text style={[styles.resultReason, { color: colors.textMuted }]}>{reason}</Text>
        <Text style={[styles.resultTags, { color: colors.accentInk }]}>
          {tags.slice(0, 2).map((tag) => tagLabel(tag.id)).join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 44, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 19, lineHeight: 25, fontWeight: '800', letterSpacing: -0.4 },
  panel: { marginTop: 14, marginHorizontal: 20, borderRadius: 20, padding: 17 },
  prompt: { fontSize: 17.5, lineHeight: 23, fontWeight: '700', letterSpacing: -0.4 },
  field: { marginTop: 13, minHeight: 44, borderRadius: 14, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  fieldDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  input: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: '600', padding: 0 },
  intents: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  intent: { minHeight: 32, borderRadius: 999, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  intentLabel: { fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  cta: { marginTop: 14 },
  results: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  lead: { fontSize: 13.5, lineHeight: 21, fontWeight: '500' },
  result: { marginTop: 18, flexDirection: 'row', gap: 13 },
  resultPhoto: { width: 86, height: 86, borderRadius: 16 },
  rank: {
    position: 'absolute',
    left: -6,
    top: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 12.5, lineHeight: 17, fontWeight: '800' },
  resultCopy: { flex: 1, minWidth: 0 },
  resultTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  resultName: { flex: 1, fontSize: 16.5, lineHeight: 22, fontWeight: '800', letterSpacing: -0.4 },
  resultDistance: { fontSize: 12.5, lineHeight: 17, fontWeight: '500' },
  resultReason: { marginTop: 4, fontSize: 13, lineHeight: 19, fontWeight: '500' },
  resultTags: { marginTop: 7, fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
});
