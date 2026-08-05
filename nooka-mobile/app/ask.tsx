import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Chip, CircleButton, ResultRow, ScreenShell } from '@/components/nooka/ui';
import { checkinLine, formatDistance, spotName, tagLabel, tagSynonyms } from '@/features/nooka/labels';
import { explainTags, matchTags, rankSpots } from '@/features/nooka/ranking';
import { INTENT_IDS, SPOTS, TAG_IDS, type SpotId, type TagId } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

/**
 * Hỏi Nooka — Intent Mode (§4 và §6.2 của spec).
 *
 * Sau khi trả lời, câu hỏi thu lại thành một thanh gọn và những gì Nooka hiểu
 * được hiện thành **chip sửa được**: đó là chỗ người dùng sửa lại cách máy hiểu
 * mình, không phải nhãn trang trí. Bỏ một chip là xếp hạng chạy lại ngay.
 *
 * Kết quả dùng chung `ResultRow` với danh sách ở tab Tìm — §5: một loại card
 * duy nhất cho cả hai chế độ.
 */
export default function AskNookaScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();
  const [dropped, setDropped] = useState<TagId[]>([]);

  const matched = useMemo(
    () => matchTags(demo.query, tagSynonyms(TAG_IDS), demo.intent).filter((tag) => !dropped.includes(tag)),
    [demo.query, demo.intent, dropped],
  );

  const results = demo.answered ? rankSpots(matched, demo.extraTags, 4) : [];

  return (
    <ScreenShell testID="ask-nooka-screen">
      <View style={styles.header}>
        <CircleButton
          accessibilityLabel={t('common.back')}
          icon="arrow-back"
          onPress={() => router.back()}
          tone="muted"
        />
        <Text style={[styles.title, { color: colors.text }]}>{t('search.title')}</Text>
        <Chip
          label={t('search.viewMap')}
          onPress={() => router.replace('/(tabs)/search')}
        />
      </View>

      {demo.answered ? (
        <Pressable
          accessibilityLabel={t('search.edit')}
          accessibilityRole="button"
          onPress={demo.reopen}
          style={[styles.queryBar, { backgroundColor: colors.inverseSurface }]}>
          <View style={[styles.ring, { borderColor: colors.accent }]} />
          <Text numberOfLines={2} style={[styles.queryText, { color: colors.onInverse }]}>
            {demo.query.trim() || t('search.prompt')}
          </Text>
          <Text style={[styles.edit, { color: colors.accent }]}>{t('search.edit')}</Text>
        </Pressable>
      ) : (
        <View style={[styles.panel, { backgroundColor: colors.inverseSurface }]}>
          <Text style={[styles.prompt, { color: colors.onInverse }]}>{t('search.prompt')}</Text>

          <View style={[styles.field, { backgroundColor: colors.surfaceMuted }]}>
            <View style={[styles.ring, { borderColor: colors.accent }]} />
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
      )}

      {demo.answered && matched.length ? (
        <ScrollView
          contentContainerStyle={styles.selection}
          horizontal
          showsHorizontalScrollIndicator={false}>
          {matched.map((tag) => (
            <Chip
              key={tag}
              label={tagLabel(tag)}
              onPress={() => setDropped((current) => [...current, tag])}
              selected
              trailing="✕"
            />
          ))}
        </ScrollView>
      ) : null}

      <ScrollView contentContainerStyle={styles.results} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lead, { color: colors.textMuted }]}>
          {demo.answered ? t('search.answerLine', { count: results.length }) : t('search.noAnswer')}
        </Text>

        {results.map((id, index) => (
          <AskResult key={id} matched={matched} rank={index + 1} spot={id} />
        ))}

        {demo.answered ? (
          <Text style={[styles.boundary, { color: colors.textSubtle }]}>{t('search.aiBoundary')}</Text>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

function AskResult({ spot, rank, matched }: { spot: SpotId; rank: number; matched: TagId[] }) {
  const router = useRouter();
  const { extraTags } = useNookaDemo();
  const detail = SPOTS[spot];
  const tags = explainTags(spot, matched, extraTags);

  return (
    <ResultRow
      distance={formatDistance(detail.distanceM)}
      onPress={() => router.push({ pathname: '/spot/[id]', params: { id: spot } })}
      rank={rank}
      reason={checkinLine(spot)}
      tags={tags.slice(0, 2).map((tag) => tagLabel(tag.id)).join(' · ')}
      tint={detail.photoTint}
      title={spotName(spot)}
    />
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 44, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontSize: 19, lineHeight: 25, fontWeight: '800', letterSpacing: -0.4 },
  panel: { marginTop: 14, marginHorizontal: 20, borderRadius: 20, padding: 17 },
  prompt: { fontSize: 17.5, lineHeight: 23, fontWeight: '700', letterSpacing: -0.4 },
  queryBar: {
    marginTop: 14,
    marginHorizontal: 20,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  queryText: { flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 19, fontWeight: '600', letterSpacing: -0.2 },
  edit: { fontSize: 12.5, lineHeight: 17, fontWeight: '700' },
  ring: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  field: { marginTop: 13, minHeight: 44, borderRadius: 14, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  input: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: '600', padding: 0 },
  intents: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  intent: { minHeight: 32, borderRadius: 999, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  intentLabel: { fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  cta: { marginTop: 14 },
  selection: { paddingHorizontal: 20, paddingTop: 14, gap: 7 },
  results: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  lead: { fontSize: 13.5, lineHeight: 21, fontWeight: '500', marginBottom: 6 },
  boundary: { marginTop: 20, fontSize: 12, lineHeight: 17, fontWeight: '500' },
});
