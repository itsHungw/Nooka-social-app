import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button, CircleButton, ScreenShell } from '@/components/nooka/ui';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { AuthApiError, requestPasswordReset } from '@/lib/auth-api';
import { t } from '@/lib/i18n';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();

  const [email, setEmail] = useState('');
  const [isFocused, setIsFocused] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<'accountNotFound' | 'resetRequestError' | null>(null);

  const isValid = email.trim().length > 3 && email.includes('@');

  const handleSendOtp = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorKey(null);
    try {
      await requestPasswordReset(email.trim());
      router.push({ pathname: '/auth/otp', params: { email: email.trim(), purpose: 'reset_password' } });
    } catch (error) {
      setErrorKey(error instanceof AuthApiError && error.status === 404 ? 'accountNotFound' : 'resetRequestError');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell testID="auth-forgot-password-screen">
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
          <Text style={[styles.title, { color: colors.text }]}>{t('auth.resetPasswordTitle')}</Text>

          {/* Mô tả */}
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('auth.resetPasswordSubtitle')}</Text>

          {/* Ô Nhập Email */}
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: errorKey
                  ? colors.mascotMouth
                  : isFocused
                    ? colors.accent
                    : colors.borderSubtle,
              },
            ]}>
            <TextInput
              accessibilityLabel={t('auth.emailPlaceholder')}
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

          {/* Nút Gửi mã OTP & Link Quay lại đăng nhập */}
          {errorKey && (
            <Text style={[styles.errorText, { color: colors.mascotMouth }]}>{t(`auth.${errorKey}`)}</Text>
          )}

          <View style={styles.bottomSection}>
            <Button
              accessibilityLabel={t('auth.sendOtpBtn')}
              label={isSubmitting ? t('auth.sendingResetCode') : t('auth.sendOtpBtn')}
              loading={isSubmitting}
              onPress={handleSendOtp}
              style={[
                styles.sendButton,
                {
                  backgroundColor: isValid ? colors.accent : colors.surfaceMuted,
                  opacity: isValid && !isSubmitting ? 1 : 0.6,
                },
              ]}
              tone={isValid && !isSubmitting ? 'accent' : 'outline'}
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/auth/email-login')}
              style={styles.backLinkFooter}>
              <Text style={[styles.backLinkText, { color: colors.textMuted }]}>
                {t('auth.rememberedPassword')}
                <Text style={[styles.backLinkBold, { color: colors.accentInk }]}>{t('auth.backToLogin')}</Text>
              </Text>
            </Pressable>
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
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 300,
    alignSelf: 'center',
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
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 16,
  },
  bottomSection: {
    marginTop: 'auto',
    paddingTop: 32,
    alignItems: 'center',
    gap: 10,
  },
  sendButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
  },
  backLinkFooter: {
    paddingVertical: 6,
  },
  backLinkText: {
    fontSize: 13,
  },
  backLinkBold: {
    fontWeight: '700',
  },
});
