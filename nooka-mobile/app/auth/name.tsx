import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, CircleButton, ScreenShell } from '@/components/nooka/ui';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

export default function NameInputScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; registrationToken?: string }>();
  const { colors } = useNookaTheme();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [focusedField, setFocusedField] = useState<'first' | 'last' | null>('first');

  const isValid = firstName.trim().length > 0;

  const handleNext = () => {
    if (!isValid) return;
    const fullName = `${lastName.trim()} ${firstName.trim()}`.trim();
    router.push({
      pathname: '/auth/username',
      params: { ...params, name: fullName },
    });
  };

  return (
    <ScreenShell testID="auth-name-screen">
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
          <Text style={[styles.title, { color: colors.text }]}>{t('auth.whatIsYourName')}</Text>

          {/* 2 Khung nhập Tên và Họ */}
          <View style={styles.inputContainer}>
            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: focusedField === 'first' ? colors.accent : colors.borderSubtle,
                },
              ]}>
              <TextInput
                accessibilityLabel={t('auth.firstNamePlaceholder')}
                autoFocus
                onBlur={() => setFocusedField(null)}
                onChangeText={setFirstName}
                onFocus={() => setFocusedField('first')}
                placeholder={t('auth.firstNamePlaceholder')}
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, { color: colors.text }]}
                value={firstName}
              />
            </View>

            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: focusedField === 'last' ? colors.accent : colors.borderSubtle,
                },
              ]}>
              <TextInput
                accessibilityLabel={t('auth.lastNamePlaceholder')}
                onBlur={() => setFocusedField(null)}
                onChangeText={setLastName}
                onFocus={() => setFocusedField('last')}
                placeholder={t('auth.lastNamePlaceholder')}
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, { color: colors.text }]}
                value={lastName}
              />
            </View>
          </View>

          {/* Chú thích tên hiển thị */}
          <Text style={[styles.subtext, { color: colors.textMuted }]}>{t('auth.nameSubtext')}</Text>

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
  inputContainer: {
    gap: 12,
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
