import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, CircleButton, ScreenShell } from '@/components/nooka/ui';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { AuthApiError, login } from '@/lib/auth-api';
import { t } from '@/lib/i18n';

export default function EmailLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { colors } = useNookaTheme();

  const [email, setEmail] = useState(params.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>('email');
  const [showError, setShowError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = email.trim().length > 3 && password.length >= 1;

  const handleLogin = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setShowError(false);
    try {
      await login({ email: email.trim(), password });
      router.replace('/(tabs)');
    } catch (error) {
      setShowError(error instanceof AuthApiError || error instanceof Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell testID="auth-email-login-screen">
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
          <Text style={[styles.title, { color: colors.text }]}>{t('auth.logInWithEmail')}</Text>

          {/* Form Đăng nhập Email + Mật khẩu */}
          <View style={styles.inputContainer}>
            {/* Ô Nhập Email */}
            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: focusedField === 'email' ? colors.accent : colors.borderSubtle,
                },
              ]}>
              <TextInput
                accessibilityLabel={t('auth.emailPlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                keyboardType="email-address"
                onBlur={() => setFocusedField(null)}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, { color: colors.text }]}
                value={email}
              />
            </View>

            {/* Ô Nhập Mật khẩu */}
            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: focusedField === 'password' ? colors.accent : colors.borderSubtle,
                },
              ]}>
              <TextInput
                accessibilityLabel={t('auth.passwordPlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={() => setFocusedField(null)}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor={colors.textSubtle}
                secureTextEntry={!showPassword}
                style={[styles.input, { color: colors.text }]}
                value={password}
              />
              <Pressable onPress={() => setShowPassword((prev) => !prev)} style={styles.toggleButton}>
                <Text style={[styles.toggleText, { color: colors.text }]}>
                  {showPassword ? t('auth.hide') : t('auth.show')}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Thẻ Cảnh báo sai mật khẩu (Màn 3f) */}
          {showError && (
            <View
              style={[styles.errorBanner, { backgroundColor: colors.accentSoft, borderColor: colors.accentStrong }]}>
              <View style={[styles.errorIconCircle, { backgroundColor: colors.accent }]}>
                <Text style={[styles.errorIconText, { color: colors.onAccent }]}>!</Text>
              </View>
              <Text style={[styles.errorText, { color: colors.text }]}>{t('auth.emailLoginError')}</Text>
            </View>
          )}

          {/* Link Quên mật khẩu? */}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/auth/forgot-password')}
            style={styles.forgotButton}>
            <Text style={[styles.forgotText, { color: colors.accentInk }]}>{t('auth.forgotPassword')}</Text>
          </Pressable>

          {/* Nút Đăng nhập & Tạo tài khoản ở đáy */}
          <View style={styles.bottomSection}>
            <Button
              accessibilityLabel={t('auth.logInArrow')}
              label={isSubmitting ? t('auth.verifyingOtp') : t('auth.logInArrow')}
              onPress={handleLogin}
              style={[styles.loginButton, { opacity: isValid && !isSubmitting ? 1 : 0.6 }]}
              tone={isValid && !isSubmitting ? 'accent' : 'outline'}
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/auth/email')}
              style={styles.createAccountFooter}>
              <Text style={[styles.createAccountText, { color: colors.textMuted }]}>
                {t('auth.noAccountPrefix')}
                <Text style={[styles.createAccountLink, { color: colors.accentInk }]}>{t('auth.createAccount')}</Text>
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
    marginBottom: 24,
  },
  inputContainer: {
    gap: 12,
  },
  inputBox: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  toggleButton: {
    paddingLeft: 12,
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  errorBanner: {
    width: '100%',
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  errorIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  errorIconText: {
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
  },
  forgotButton: {
    marginTop: 14,
    alignSelf: 'center',
  },
  forgotText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  bottomSection: {
    marginTop: 'auto',
    paddingTop: 32,
    alignItems: 'center',
    gap: 16,
  },
  loginButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
  },
  createAccountFooter: {
    paddingVertical: 4,
  },
  createAccountText: {
    fontSize: 13,
    lineHeight: 18,
  },
  createAccountLink: {
    fontWeight: '700',
  },
});
