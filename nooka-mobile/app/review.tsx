import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Chip, ScreenShell, SectionLabel } from '@/components/nooka/ui';
import { spotName } from '@/features/nooka/labels';
import { REVIEW_QUESTIONS } from '@/features/nooka/spots';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

/**
 * Ba câu hỏi ngắn thay cho ô sao. Câu trả lời "không bị nhắc" và "rẻ" biến
 * thành tag thật trên trang địa điểm — xem `submitReview` ở provider.
 */
export default function ReviewScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const demo = useNookaDemo();
  const name = spotName(demo.reviewSpot);

  return (
    <ScreenShell edges={['top', 'bottom']} testID="review-screen">
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.back()}>
          <Text style={[styles.headerAction, { color: colors.textMuted }]}>{t('common.later')}</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{t('review.title')}</Text>
        <Text style={[styles.headerAction, { color: colors.textSubtle }]}>{t('review.notRequired')}</Text>
      </View>

      <View style={[styles.notification, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
        <View style={[styles.notificationIcon, { backgroundColor: colors.inverseSurface }]} />
        <View style={styles.notificationCopy}>
          <Text style={[styles.notificationTitle, { color: colors.textMuted }]}>{t('review.notifTitle')}</Text>
          <Text style={[styles.notificationBody, { color: colors.text }]}>{t('review.notifBody', { spot: name })}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[styles.spotName, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.stay, { color: colors.textMuted }]}>{t('review.hereFor')}</Text>

        <View style={styles.section}>
          <SectionLabel>{t('review.threeQuestions')}</SectionLabel>
        </View>

        {REVIEW_QUESTIONS.map((question) => (
          <View key={question.id} style={styles.question}>
            <Text style={[styles.questionLabel, { color: colors.text }]}>{t(`review.questions.${question.id}`)}</Text>
            <View style={styles.options}>
              {question.options.map((option) => (
                <Chip
                  key={option}
                  label={t(`review.answers.${option}`)}
                  onPress={() => demo.setReviewAnswer(question.id, option)}
                  selected={demo.reviewAnswers[question.id] === option}
                />
              ))}
            </View>
          </View>
        ))}

        <TextInput
          accessibilityLabel={t('review.placeholder')}
          placeholder={t('review.placeholder')}
          placeholderTextColor={colors.textSubtle}
          style={[styles.freeText, { color: colors.text, borderColor: colors.border }]}
        />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <Button
          label={t('review.submit')}
          onPress={() => {
            demo.submitReview();
            router.back();
          }}
          style={styles.submit}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 40, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerAction: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '800', letterSpacing: -0.4 },
  notification: {
    marginTop: 12,
    marginHorizontal: 14,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: 'row',
    gap: 11,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  notificationIcon: { width: 34, height: 34, borderRadius: 10 },
  notificationCopy: { flex: 1, minWidth: 0 },
  notificationTitle: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
  notificationBody: { marginTop: 4, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  body: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 },
  spotName: { fontSize: 21, lineHeight: 27, fontWeight: '800', letterSpacing: -0.4 },
  stay: { marginTop: 6, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  section: { marginTop: 20, marginBottom: 4 },
  question: { marginTop: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  questionLabel: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  options: { flexDirection: 'row', gap: 6 },
  freeText: { marginTop: 22, minHeight: 40, borderBottomWidth: 1, paddingBottom: 10, fontSize: 15, fontWeight: '500' },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1 },
  submit: { minHeight: 50, borderRadius: 16 },
});
