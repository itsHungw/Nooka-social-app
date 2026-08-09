import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { AuthApiError, requestPasswordReset, resendVerification, verifyEmail } from '@/lib/auth-api';
import { t } from '@/lib/i18n';

export default function OtpVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; purpose?: string }>();
  const { colors } = useNookaTheme();
  const email = params.email || 'ban@gmail.com';
  const purpose = params.purpose || 'signup'; // 'signup' | 'reset_password'

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [timer, setTimer] = useState<number>(47);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const otpCode = otp.join('');
  const isComplete = otpCode.length === 6;

  const handleTextChange = (text: string, index: number) => {
    // Handle paste of 6-digit code
    const cleanText = text.replace(/[^0-9]/g, '');

    if (cleanText.length > 1) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        if (i < cleanText.length) {
          newOtp[i] = cleanText[i];
        }
      }
      setOtp(newOtp);
      setIsError(false);
      const nextFocus = Math.min(cleanText.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanText;
    setOtp(newOtp);
    setIsError(false);

    if (cleanText.length > 0 && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (isSubmitting) return;
    setTimer(60);
    setIsError(false);
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    try {
      if (purpose === 'reset_password') {
        await requestPasswordReset(email);
      } else {
        await resendVerification(email);
      }
    } catch (error) {
      setIsError(error instanceof AuthApiError || error instanceof Error);
    }
  };

  const handleVerify = async () => {
    if (!isComplete || isSubmitting) return;
    setIsSubmitting(true);
    setIsError(false);
    try {
      if (purpose === 'reset_password') {
        router.push({ pathname: '/auth/reset-password', params: { email, code: otpCode } });
      } else {
        const verification = await verifyEmail({ email, code: otpCode });
        router.push({
          pathname: '/auth/name',
          params: { email: verification.email, registrationToken: verification.registrationToken },
        });
      }
    } catch (error) {
      setIsError(error instanceof AuthApiError || error instanceof Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell testID="auth-otp-screen">
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
          <Text style={[styles.title, { color: colors.text }]}>{t('auth.enterOtpTitle')}</Text>

          {/* Dòng Email */}
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {t('auth.otpSentToPrefix')}
            <Text style={[styles.boldText, { color: colors.text }]}>{email}</Text>
          </Text>

          {/* Khung 6 ô nhập OTP */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => {
              const isFocused = focusedIndex === index;
              return (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: isError
                        ? colors.accent
                        : isFocused
                          ? colors.accent
                          : digit
                            ? colors.accent
                            : colors.borderSubtle,
                    },
                  ]}>
                  <TextInput
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    accessibilityLabel={`OTP digit ${index + 1}`}
                    autoFocus={index === 0}
                    keyboardType="number-pad"
                    maxLength={index === 0 ? 6 : 1}
                    onBlur={() => setFocusedIndex(-1)}
                    onChangeText={(text) => handleTextChange(text, index)}
                    onFocus={() => setFocusedIndex(index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    selectTextOnFocus
                    style={[styles.otpInput, { color: colors.text }]}
                    value={digit}
                  />
                </View>
              );
            })}
          </View>

          {/* Thẻ Cảnh báo mã sai (Màn 4b) */}
          {isError && (
            <View
              style={[styles.errorBanner, { backgroundColor: colors.accentSoft, borderColor: colors.accentStrong }]}>
              <View style={[styles.errorIconCircle, { backgroundColor: colors.accent }]}>
                <Text style={[styles.errorIconText, { color: colors.onAccent }]}>!</Text>
              </View>
              <Text style={[styles.errorText, { color: colors.text }]}>{t('auth.otpErrorBanner')}</Text>
            </View>
          )}

          {/* Khu vực Gửi lại mã & Đổi email */}
          <View style={styles.actionLinksContainer}>
            {timer > 0 ? (
              <Text style={[styles.timerText, { color: colors.textMuted }]}>
                {t('auth.resendCodeIn')}
                {`0:${timer < 10 ? '0' : ''}${timer}`}
              </Text>
            ) : (
              <Pressable onPress={handleResend} style={styles.linkButton}>
                <Text style={[styles.resendLink, { color: colors.accentInk }]}>{t('auth.resendCode')}</Text>
              </Pressable>
            )}

            <Pressable onPress={() => router.push('/auth/email')} style={styles.linkButton}>
              <Text style={[styles.changeEmailText, { color: colors.textMuted }]}>
                {t('auth.wrongEmailQuestion')}
                <Text style={[styles.changeEmailBold, { color: colors.accentInk }]}>{t('auth.changeEmail')}</Text>
              </Text>
            </Pressable>
          </View>

          {/* Nút Xác nhận ở dưới */}
          <View style={styles.bottomSection}>
            <Button
              accessibilityLabel={
                isSubmitting
                  ? t('auth.verifyingOtp')
                  : isError
                    ? t('auth.retryOtpBtn')
                    : t('auth.confirmOtpBtn')
              }
              label={
                isSubmitting
                  ? t('auth.verifyingOtp')
                  : isError
                    ? t('auth.retryOtpBtn')
                    : t('auth.confirmOtpBtn')
              }
              onPress={handleVerify}
              style={[
                styles.confirmButton,
                {
                  backgroundColor: isComplete ? colors.accent : colors.surfaceMuted,
                  opacity: isComplete && !isSubmitting ? 1 : 0.6,
                },
              ]}
              tone={isComplete ? 'accent' : 'outline'}
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 28,
  },
  boldText: {
    fontWeight: '700',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpInput: {
    width: '100%',
    height: '100%',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorBanner: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 16,
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
  actionLinksContainer: {
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  linkButton: {
    paddingVertical: 4,
  },
  resendLink: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  changeEmailText: {
    fontSize: 13,
  },
  changeEmailBold: {
    fontWeight: '700',
  },
  bottomSection: {
    marginTop: 'auto',
    paddingTop: 32,
    alignItems: 'center',
  },
  confirmButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
  },
});
