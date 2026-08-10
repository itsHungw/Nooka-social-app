import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Vibration,
} from 'react-native';

import { Button, CircleButton, ScreenShell } from '@/components/nooka/ui';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { AuthApiError, login } from '@/lib/auth-api';
import { t } from '@/lib/i18n';
import { useAuthSession } from '@/providers/auth-session-provider';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_UNTIL_KEY = '@nooka/login-lockout-until';
const FAILED_ATTEMPTS_KEY = '@nooka/login-failed-attempts';
const LOCKOUT_LEVEL_KEY = '@nooka/login-lockout-level';

function getLockoutDurationSeconds(level: number): number {
  if (level <= 1) return 180; // 3 minutes for 1st lockout
  if (level === 2) return 300; // 5 minutes for 2nd lockout
  if (level === 3) return 900; // 15 minutes for 3rd lockout
  return 1800; // 30 minutes for 4th+ lockout
}

function formatCountdown(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function EmailLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { colors } = useNookaTheme();
  const { completeAuth } = useAuthSession();

  const [email, setEmail] = useState(params.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>('email');
  const [showError, setShowError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutLevel, setLockoutLevel] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const isLockedOut = lockoutSeconds > 0;
  const isValid = email.trim().length > 3 && password.length >= 1;

  useEffect(() => {
    let active = true;
    const checkPersistedLockout = async () => {
      try {
        const [untilStr, failedStr, levelStr] = await Promise.all([
          AsyncStorage.getItem(LOCKOUT_UNTIL_KEY),
          AsyncStorage.getItem(FAILED_ATTEMPTS_KEY),
          AsyncStorage.getItem(LOCKOUT_LEVEL_KEY),
        ]);

        if (!active) return;

        if (levelStr) {
          setLockoutLevel(Number(levelStr));
        }

        if (untilStr) {
          const until = Number(untilStr);
          const remainingMs = until - Date.now();
          if (remainingMs > 0) {
            const remainingSecs = Math.ceil(remainingMs / 1000);
            setLockoutSeconds(remainingSecs);
            setFailedAttempts(MAX_FAILED_ATTEMPTS);
            return;
          } else {
            await Promise.all([
              AsyncStorage.removeItem(LOCKOUT_UNTIL_KEY),
              AsyncStorage.removeItem(FAILED_ATTEMPTS_KEY),
            ]);
          }
        }

        if (failedStr) {
          setFailedAttempts(Number(failedStr));
        }
      } catch {
        // Fallback silently if storage read fails
      }
    };

    void checkPersistedLockout();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setFailedAttempts(0);
          void Promise.all([
            AsyncStorage.removeItem(LOCKOUT_UNTIL_KEY),
            AsyncStorage.removeItem(FAILED_ATTEMPTS_KEY),
          ]).catch(() => undefined);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleLogin = async () => {
    if (!isValid || isSubmitting || isLockedOut) return;

    setIsSubmitting(true);
    setShowError(false);
    try {
      const response = await login({ email: email.trim(), password });
      completeAuth(response);
      setFailedAttempts(0);
      setLockoutLevel(0);
      void Promise.all([
        AsyncStorage.removeItem(LOCKOUT_UNTIL_KEY),
        AsyncStorage.removeItem(FAILED_ATTEMPTS_KEY),
        AsyncStorage.removeItem(LOCKOUT_LEVEL_KEY),
      ]).catch(() => undefined);
      router.replace('/(tabs)');
    } catch (error) {
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);
      void AsyncStorage.setItem(FAILED_ATTEMPTS_KEY, String(nextFailed)).catch(() => undefined);

      if (nextFailed >= MAX_FAILED_ATTEMPTS || (error instanceof AuthApiError && error.status === 429)) {
        const nextLevel = lockoutLevel + 1;
        setLockoutLevel(nextLevel);
        const durationSecs = getLockoutDurationSeconds(nextLevel);
        const lockoutUntil = Date.now() + durationSecs * 1000;

        void Promise.all([
          AsyncStorage.setItem(LOCKOUT_LEVEL_KEY, String(nextLevel)),
          AsyncStorage.setItem(LOCKOUT_UNTIL_KEY, String(lockoutUntil)),
        ]).catch(() => undefined);

        setLockoutSeconds(durationSecs);
        Vibration.vibrate(120);
        setShowError(false);
      } else {
        setShowError(true);
      }
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
                editable={!isLockedOut}
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
                editable={!isLockedOut}
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

          {/* Cảnh báo sai mật khẩu / Thử quá nhiều lần có đếm ngược (dạng status row không khung) */}
          {isLockedOut ? (
            <View style={styles.statusRow}>
              <View style={[styles.statusIcon, { backgroundColor: colors.mascotMouth }]}>
                <Ionicons color={colors.onAccent} name="time-outline" size={14} />
              </View>
              <Text style={[styles.statusText, { color: colors.mascotMouth }]}>
                {t('auth.tooManyAttemptsDesc', { time: formatCountdown(lockoutSeconds) })}
              </Text>
            </View>
          ) : showError ? (
            <View style={styles.statusRow}>
              <View style={[styles.statusIcon, { backgroundColor: colors.mascotMouth }]}>
                <Text style={[styles.statusIconText, { color: colors.onAccent }]}>{'\u00d7'}</Text>
              </View>
              <Text style={[styles.statusText, { color: colors.mascotMouth }]}>{t('auth.emailLoginError')}</Text>
            </View>
          ) : null}

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
              disabled={!isValid || isSubmitting || isLockedOut}
              label={
                isLockedOut
                  ? t('auth.lockoutButtonText', { time: formatCountdown(lockoutSeconds) })
                  : isSubmitting
                    ? t('auth.verifyingOtp')
                    : t('auth.logInArrow')
              }
              loading={isSubmitting}
              onPress={handleLogin}
              style={[
                styles.loginButton,
                { opacity: isValid && !isSubmitting && !isLockedOut ? 1 : 0.5 },
              ]}
              tone={isValid && !isSubmitting && !isLockedOut ? 'accent' : 'outline'}
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  statusIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconText: {
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '900',
  },
  statusText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '700',
  },
  forgotButton: {
    marginTop: 26,
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
