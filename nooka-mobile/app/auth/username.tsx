import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, CircleButton, ScreenShell } from '@/components/nooka/ui';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

export default function UsernameInputScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const { flash } = useNookaDemo();

  const [username, setUsername] = useState('minh.saigon');
  const [isFocused, setIsFocused] = useState(true);

  const isAvailable = username.trim().length >= 3;

  const handleComplete = () => {
    flash(t('auth.toastLoggedIn'));
    router.replace('/(tabs)');
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
                borderColor: isFocused ? colors.accent : colors.borderSubtle,
              },
            ]}>
            <Text style={[styles.atPrefix, { color: colors.text }]}>@</Text>
            <TextInput
              accessibilityLabel={t('auth.chooseUsername')}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              onBlur={() => setIsFocused(false)}
              onChangeText={(text) => setUsername(text.replace(/^@/, ''))}
              onFocus={() => setIsFocused(true)}
              placeholder={t('auth.usernamePlaceholder')}
              placeholderTextColor={colors.textSubtle}
              style={[styles.input, { color: colors.text }]}
              value={username}
            />
            {isAvailable && (
              <Text style={[styles.availableTag, { color: colors.online }]}>{t('auth.usernameAvailable')}</Text>
            )}
          </View>

          {/* Chú thích username */}
          <Text style={[styles.subtext, { color: colors.textMuted }]}>{t('auth.usernameSubtext')}</Text>

          {/* Nút Tiếp tục & Bỏ qua (Để sau) ở đáy màn hình */}
          <View style={styles.bottomSection}>
            <Button
              accessibilityLabel={t('auth.continueArrow')}
              label={t('auth.continueArrow')}
              onPress={handleComplete}
              style={styles.continueButton}
              tone="accent"
            />

            <Pressable accessibilityRole="button" onPress={handleComplete} style={styles.skipButton}>
              <Text style={[styles.skipText, { color: colors.textSubtle }]}>{t('auth.later')}</Text>
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
  bottomSection: {
    marginTop: 'auto',
    paddingTop: 32,
    alignItems: 'center',
    gap: 14,
  },
  continueButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
  },
  skipButton: {
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '600',
  },
});
