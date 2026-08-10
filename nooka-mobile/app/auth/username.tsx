import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { AuthApiError, checkUsernameAvailability, completeRegistration } from '@/lib/auth-api';
import { t } from '@/lib/i18n';

type UsernameStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'error';

export default function UsernameInputScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; registrationToken?: string; name?: string }>();
  const { colors } = useNookaTheme();

  const [username, setUsername] = useState('');
  const [isFocused, setIsFocused] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [availability, setAvailability] = useState<UsernameStatus>('idle');

  useEffect(() => {
    const normalizedUsername = username.trim();
    setHasError(false);

    if (!normalizedUsername) {
      setAvailability('idle');
      return;
    }
    if (normalizedUsername.length < 3) {
      setAvailability('invalid');
      return;
    }

    let cancelled = false;
    setAvailability('checking');
    const timeout = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(normalizedUsername);
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
  }, [username]);

  useEffect(() => {
    if (availability === 'taken') {
      Vibration.vibrate(120);
    }
  }, [availability]);

  const isAvailable = availability === 'available';
  const hasValidationError = availability === 'invalid' || availability === 'taken' || availability === 'error';
  const statusMessage =
    availability === 'invalid'
      ? t('auth.usernameTooShort')
      : availability === 'taken'
        ? t('auth.usernameTaken')
        : availability === 'error'
          ? t('auth.usernameCheckError')
          : null;

  const handleComplete = async () => {
    if (!isAvailable || isSubmitting) return;
    if (!params.registrationToken || !params.name) {
      setHasError(true);
      return;
    }

    setIsSubmitting(true);
    setHasError(false);
    try {
      await completeRegistration({
        registrationToken: params.registrationToken,
        displayName: params.name,
        username: username.trim(),
      });
      router.replace('/(tabs)');
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 409) {
        setAvailability('taken');
        Vibration.vibrate(120);
      } else {
        setHasError(error instanceof AuthApiError || error instanceof Error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell testID="auth-username-screen">
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
          <Text style={[styles.title, { color: colors.text }]}>{t('auth.chooseUsername')}</Text>

          {/* Khung Nhập Username với nhãn Còn trống */}
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: hasValidationError
                  ? colors.mascotMouth
                  : isFocused
                    ? colors.accent
                    : colors.borderSubtle,
              },
            ]}>
            <Text style={[styles.atPrefix, { color: colors.text }]}>@</Text>
            <TextInput
              accessibilityLabel={t('auth.chooseUsername')}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              onBlur={() => setIsFocused(false)}
              onChangeText={(text) => setUsername(text.replace(/^@/, '').replace(/\s/g, ''))}
              onFocus={() => setIsFocused(true)}
              placeholder={t('auth.usernamePlaceholder')}
              placeholderTextColor={colors.textSubtle}
              style={[styles.input, { color: colors.text }]}
              value={username}
            />
            {availability === 'checking' && <ActivityIndicator color={colors.accentInk} size="small" />}
            {isAvailable && (
              <Text style={[styles.availableTag, { color: colors.online }]}>{t('auth.usernameAvailable')}</Text>
            )}
          </View>

          {/* Chú thích username */}
          {statusMessage && (
            <View style={styles.statusRow}>
              <View style={[styles.statusIcon, { backgroundColor: colors.mascotMouth }]}>
                <Text style={[styles.statusIconText, { color: colors.onAccent }]}>{'\u00d7'}</Text>
              </View>
              <Text style={[styles.statusText, { color: colors.mascotMouth }]}>{statusMessage}</Text>
            </View>
          )}

          {/* Username hint */}
          <Text style={[styles.subtext, { color: colors.textMuted }]}>{t('auth.usernameSubtext')}</Text>

          {hasError && (
            <Text style={[styles.errorText, { color: colors.mascotMouth }]}>{t('auth.registerError')}</Text>
          )}

          <View style={styles.bottomSection}>
            {isSubmitting && (
              <ActivityIndicator color={colors.accentInk} size="small" style={styles.loadingIndicator} />
            )}
            <Button
              accessibilityLabel={t('auth.continueArrow')}
              label={isSubmitting ? t('auth.registerSubmitting') : t('auth.continueArrow')}
              onPress={handleComplete}
              style={[styles.continueButton, { opacity: isAvailable && !isSubmitting ? 1 : 0.5 }]}
              tone={isAvailable && !isSubmitting ? 'accent' : 'outline'}
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
  atPrefix: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  availableTag: {
    fontSize: 13,
    fontWeight: '700',
    paddingLeft: 8,
  },
  subtext: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
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
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 18,
  },
  bottomSection: {
    marginTop: 'auto',
    paddingTop: 32,
    alignItems: 'center',
    gap: 10,
  },
  loadingIndicator: {
    marginBottom: 2,
  },
  continueButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
  },
});
