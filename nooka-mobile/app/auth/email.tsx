import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, CircleButton, ScreenShell } from '@/components/nooka/ui';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

export default function EmailInputScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const [email, setEmail] = useState('');
  const [isFocused, setIsFocused] = useState(true);

  const isValid = email.trim().length > 3 && email.includes('@');

  const handleNext = () => {
    if (!isValid) return;
    router.push({ pathname: '/auth/password', params: { email } });
  };

  return (
    <ScreenShell testID="auth-email-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={styles.keyboardAvoid}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Nút Back */}
          <View style={styles.header}>
            <CircleButton accessibilityLabel={t('common.back')} icon="arrow-back" onPress={() => router.back()} />
          </View>

          {/* Tiêu đề */}
          <Text style={[styles.title, { color: colors.text }]}>{t('auth.whatIsYourEmail')}</Text>

          {/* Khung Nhập Email */}
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: isFocused ? colors.accent : colors.borderSubtle,
              },
            ]}>
            <TextInput
              accessibilityLabel={t('auth.whatIsYourEmail')}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              keyboardType="email-address"
              onBlur={() => setIsFocused(false)}
              onChangeText={setEmail}
              onFocus={() => setIsFocused(true)}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={colors.textSubtle}
              style={[styles.input, { color: colors.text }]}
              value={email}
            />
          </View>

          {/* Chú thích email */}
          <Text style={[styles.subtext, { color: colors.textMuted }]}>{t('auth.emailSubtext')}</Text>

          {/* Phần nút Tiếp tục ở dưới */}
          <View style={styles.bottomSection}>
            <Text style={[styles.termsText, { color: colors.textMuted }]}>
              {t('auth.termsNoticeEmailPrefix')}
              <Text style={[styles.linkText, { color: colors.accentInk }]}>{t('auth.termsOfService')}</Text>
              {t('auth.termsNoticeAnd')}
              <Text style={[styles.linkText, { color: colors.accentInk }]}>{t('auth.privacyPolicy')}</Text>
            </Text>

            <Button
              accessibilityLabel={t('auth.continueArrow')}
              label={t('auth.continueArrow')}
              onPress={handleNext}
              style={[styles.continueButton, { opacity: isValid ? 1 : 0.5 }]}
              tone="accent"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
    flexGrow: 1,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputBox: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  subtext: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 14,
    maxWidth: 320,
    alignSelf: 'center',
  },
  bottomSection: {
    marginTop: 'auto',
    paddingTop: 32,
    gap: 14,
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    maxWidth: 320,
  },
  linkText: {
    fontWeight: '700',
  },
  continueButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
  },
});
