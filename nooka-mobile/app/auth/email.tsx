import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Vibration,
} from 'react-native';

import { Button, CircleButton, ScreenShell } from '@/components/nooka/ui';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { checkEmailAvailability } from '@/lib/auth-api';
import { t } from '@/lib/i18n';

type EmailStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'error';

export default function EmailInputScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const [email, setEmail] = useState('');
  const [isFocused, setIsFocused] = useState(true);
  const [availability, setAvailability] = useState<EmailStatus>('idle');

  useEffect(() => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setAvailability('idle');
      return;
    }

    const simpleEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!normalizedEmail.includes('@') || normalizedEmail.length < 5 || !simpleEmailRegex.test(normalizedEmail)) {
      setAvailability('invalid');
      return;
    }

    let cancelled = false;
    setAvailability('checking');
    const timeout = setTimeout(async () => {
      try {
        const available = await checkEmailAvailability(normalizedEmail);
        if (!cancelled) {
          setAvailability(available ? 'available' : 'taken');
        }
      } catch {
        if (!cancelled) {
          setAvailability('error');
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [email]);

  useEffect(() => {
    if (availability === 'taken') {
      Vibration.vibrate(120);
    }
  }, [availability]);

  const isAvailable = availability === 'available';
  const hasValidationError = availability === 'invalid' || availability === 'taken' || availability === 'error';
  const statusMessage =
    availability === 'invalid'
      ? t('auth.emailInvalid')
      : availability === 'taken'
        ? t('auth.emailTaken')
        : availability === 'error'
          ? t('auth.emailCheckError')
          : null;

  const handleNext = () => {
    if (!isAvailable) {
      if (availability === 'taken') {
        Vibration.vibrate(120);
      }
      return;
    }
    router.push({ pathname: '/auth/password', params: { email: email.trim() } });
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

          {/* Khung Nhập Email với nhãn Còn trống / Báo lỗi */}
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor:
                  hasValidationError && email.trim().length > 0
                    ? colors.mascotMouth
                    : isFocused
                      ? colors.accent
                      : colors.borderSubtle,
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
            {availability === 'checking' && <ActivityIndicator color={colors.accentInk} size="small" />}
            {isAvailable && (
              <View style={styles.availableBadge}>
                <Ionicons color={colors.online} name="checkmark-circle" size={20} />
              </View>
            )}
          </View>

          {/* Dòng cảnh báo lỗi dạng icon × và chữ đỏ */}
          {statusMessage && email.trim().length > 0 && (
            <View style={styles.statusRow}>
              <View style={[styles.statusIcon, { backgroundColor: colors.mascotMouth }]}>
                <Text style={[styles.statusIconText, { color: colors.onAccent }]}>{'\u00d7'}</Text>
              </View>
              <Text style={[styles.statusText, { color: colors.mascotMouth }]}>{statusMessage}</Text>
            </View>
          )}

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
              disabled={!isAvailable}
              label={t('auth.continueArrow')}
              onPress={handleNext}
              style={[styles.continueButton, { opacity: isAvailable ? 1 : 0.5 }]}
              tone={isAvailable ? 'accent' : 'outline'}
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  availableBadge: {
    paddingLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
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
