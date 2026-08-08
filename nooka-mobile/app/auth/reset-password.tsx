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
import { t } from '@/lib/i18n';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'password' | 'confirm' | null>('password');

  // Password strength logic
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);

  let strengthScore = 0;
  if (password.length > 0) {
    if (password.length >= 6) strengthScore += 1;
    if (hasMinLength && (hasNumber || hasLetter)) strengthScore += 1;
    if (hasMinLength && hasNumber && hasLetter) strengthScore += 1;
  }

  const isValid = hasMinLength && password === confirmPassword;

  const handleSave = () => {
    if (!isValid) return;
    router.push('/auth/reset-success');
  };

  const getSegmentColor = (index: number) => {
    if (strengthScore <= index) return colors.borderSubtle;
    if (strengthScore === 1) return colors.accent;
    if (strengthScore === 2) return colors.accent;
    return colors.online; // Green accent for strong password
  };

  return (
    <ScreenShell testID="auth-reset-password-screen">
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
          <Text style={[styles.title, { color: colors.text }]}>{t('auth.newPasswordTitle')}</Text>

          <View style={styles.inputSection}>
            {/* Ô Nhập Mật khẩu mới */}
            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: focusedField === 'password' ? colors.accent : colors.borderSubtle,
                },
              ]}>
              <TextInput
                accessibilityLabel={t('auth.newPasswordPlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                onBlur={() => setFocusedField(null)}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                placeholder={t('auth.newPasswordPlaceholder')}
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

            {/* Thanh đo độ mạnh mật khẩu */}
            <View style={styles.strengthMeterContainer}>
              <View style={styles.strengthSegments}>
                <View style={[styles.segment, { backgroundColor: getSegmentColor(0) }]} />
                <View style={[styles.segment, { backgroundColor: getSegmentColor(1) }]} />
                <View style={[styles.segment, { backgroundColor: getSegmentColor(2) }]} />
              </View>
              <Text style={[styles.strengthText, { color: colors.textMuted }]}>
                {t('auth.passwordStrengthSubtext')}
              </Text>
            </View>

            {/* Ô Nhập lại mật khẩu */}
            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: focusedField === 'confirm' ? colors.accent : colors.borderSubtle,
                },
              ]}>
              <TextInput
                accessibilityLabel={t('auth.confirmPasswordPlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={() => setFocusedField(null)}
                onChangeText={setConfirmPassword}
                onFocus={() => setFocusedField('confirm')}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                placeholderTextColor={colors.textSubtle}
                secureTextEntry={!showPassword}
                style={[styles.input, { color: colors.text }]}
                value={confirmPassword}
              />
            </View>
          </View>

          {/* Ghi chú đăng xuất thiết bị khác */}
          <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
            {t('auth.resetPasswordDisclaimer')}
          </Text>

          {/* Nút Lưu mật khẩu ở đáy */}
          <View style={styles.bottomSection}>
            <Button
              accessibilityLabel={t('auth.savePasswordBtn')}
              label={t('auth.savePasswordBtn')}
              onPress={handleSave}
              style={[
                styles.saveButton,
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
  inputSection: {
    gap: 16,
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
  strengthMeterContainer: {
    gap: 8,
    paddingHorizontal: 2,
  },
  strengthSegments: {
    flexDirection: 'row',
    gap: 6,
    height: 4,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
  },
  disclaimerText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 20,
    maxWidth: 300,
    alignSelf: 'center',
  },
  bottomSection: {
    marginTop: 'auto',
    paddingTop: 32,
    alignItems: 'center',
  },
  saveButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
  },
});
