import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NookaMascot } from '@/components/nooka/nooka-mascot';
import { Button, ScreenShell } from '@/components/nooka/ui';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();

  return (
    <ScreenShell testID="welcome-screen">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Linh vật trong hình tròn */}
        <View style={[styles.mascotCircle, { backgroundColor: colors.surfaceMuted }]}>
          <NookaMascot size={74} />
        </View>

        {/* Tiêu đề & Thông điệp */}
        <Text style={[styles.brandTitle, { color: colors.text }]}>{t('welcome.title')}</Text>
        <Text style={[styles.headline, { color: colors.text }]}>{t('welcome.headline')}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('welcome.subtitle')}</Text>

        {/* Danh sách 3 tính năng nổi bật */}
        <View style={styles.featureList}>
          <Pressable
            accessibilityLabel={t('welcome.features.preview.title')}
            accessibilityRole="button"
            onPress={() => router.push('/login')}
            style={({ pressed }) => [
              styles.featureCard,
              { backgroundColor: colors.surface, borderColor: colors.borderSubtle, opacity: pressed ? 0.8 : 1 },
            ]}>
            <View style={[styles.iconBox, { backgroundColor: colors.surfaceMuted }]}>
              <Ionicons color={colors.accentInk} name="location" size={22} />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>{t('welcome.features.preview.title')}</Text>
              <Text style={[styles.featureDesc, { color: colors.textMuted }]}>{t('welcome.features.preview.desc')}</Text>
            </View>
            <Ionicons color={colors.textSubtle} name="chevron-forward" size={16} />
          </Pressable>

          <Pressable
            accessibilityLabel={t('welcome.features.friends.title')}
            accessibilityRole="button"
            onPress={() => router.push('/login')}
            style={({ pressed }) => [
              styles.featureCard,
              { backgroundColor: colors.surface, borderColor: colors.borderSubtle, opacity: pressed ? 0.8 : 1 },
            ]}>
            <View style={[styles.iconBox, { backgroundColor: colors.surfaceMuted }]}>
              <Ionicons color={colors.textMuted} name="people" size={22} />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>{t('welcome.features.friends.title')}</Text>
              <Text style={[styles.featureDesc, { color: colors.textMuted }]}>{t('welcome.features.friends.desc')}</Text>
            </View>
            <Ionicons color={colors.textSubtle} name="chevron-forward" size={16} />
          </Pressable>

          <Pressable
            accessibilityLabel={t('welcome.features.saved.title')}
            accessibilityRole="button"
            onPress={() => router.push('/login')}
            style={({ pressed }) => [
              styles.featureCard,
              { backgroundColor: colors.surface, borderColor: colors.borderSubtle, opacity: pressed ? 0.8 : 1 },
            ]}>
            <View style={[styles.iconBox, { backgroundColor: colors.surfaceMuted }]}>
              <Ionicons color={colors.accentInk} name="bookmark" size={22} />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>{t('welcome.features.saved.title')}</Text>
              <Text style={[styles.featureDesc, { color: colors.textMuted }]}>{t('welcome.features.saved.desc')}</Text>
            </View>
            <Ionicons color={colors.textSubtle} name="chevron-forward" size={16} />
          </Pressable>
        </View>

        {/* Nút chính & Chú thích */}
        <View style={styles.bottomSection}>
          <Button
            label={t('welcome.cta')}
            onPress={() => router.push('/login')}
            style={styles.ctaButton}
            tone="primary"
          />
          <Text style={[styles.footerNote, { color: colors.textSubtle }]}>{t('welcome.footer')}</Text>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
  },
  mascotCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headline: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 300,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 320,
  },
  featureList: {
    width: '100%',
    marginTop: 32,
    gap: 12,
  },
  featureCard: {
    minHeight: 74,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  featureTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
  },
  bottomSection: {
    width: '100%',
    marginTop: 36,
    gap: 14,
  },
  ctaButton: {
    minHeight: 52,
    borderRadius: 16,
  },
  footerNote: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
    textAlign: 'center',
  },
});
