import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, CircleButton, ScreenShell } from '@/components/nooka/ui';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

export default function PasswordInputScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { colors } = useNookaTheme();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(true);

  const isValid = password.length >= 8;

  const handleNext = () => {
    if (!isValid) return;
    router.push({ pathname: '/auth/name', params: { email: params.email, password } });
  };

  return (
    <ScreenShell testID="auth-password-screen">
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
          <Text style={[styles.title, { color: colors.text }]}>{t('auth.choosePassword')}</Text>

          {/* Khung Nhập Mật khẩu */}
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: isFocused ? colors.accent : colors.borderSubtle,
              },
            ]}>
            <TextInput
              accessibilityLabel={t('auth.choosePassword')}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              onBlur={() => setIsFocused(false)}
              onChangeText={setPassword}
              onFocus={() => setIsFocused(true)}
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

          {/* Chú thích độ dài mật khẩu */}
          <Text style={[styles.subtext, { color: colors.textMuted }]}>
            {t('auth.passwordMinLengthPrefix')}
            <Text style={[styles.boldSubtext, { color: colors.accentInk }]}>{t('auth.passwordMinLengthNumber')}</Text>
          </Text>

          {/* Nút Tiếp tục ở đáy màn hình */}
          <View style={styles.bottomSection}>
            <Button
              accessibilityLabel={t('auth.continueArrow')}
              label={t('auth.continueArrow')}
              onPress={handleNext}
              style={[
                styles.continueButton,
                {
                  backgroundColor: isValid ? colors.accent : colors.surfaceMuted,
                  opacity: isValid ? 1 : 0.6,
                },
              ]}
              tone={isValid ? 'accent' : 'outline'}
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
  toggleButton: {
    paddingLeft: 12,
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  subtext: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 14,
  },
  boldSubtext: {
    fontWeight: '800',
  },
  bottomSection: {
    marginTop: 'auto',
    paddingTop: 32,
    alignItems: 'center',
  },
  continueButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
  },
});
