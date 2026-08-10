import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, ScreenShell } from '@/components/nooka/ui';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

export default function ResetSuccessScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();
  const { flash } = useNookaDemo();

  const handleEnter = () => {
    flash(t('auth.toastLoggedIn'));
    router.replace('/(tabs)');
  };

  return (
    <ScreenShell testID="auth-reset-success-screen">
      <View style={styles.container}>
        {/* Khối giữa màn hình */}
        <View style={styles.centerContent}>
          {/* Icon Tích vàng trong hình tròn (Màn 4g) */}
          <View style={[styles.checkCircle, { backgroundColor: colors.accent }]}>
            <Ionicons color={colors.onAccent} name="checkmark" size={38} />
          </View>

          {/* Tiêu đề "Xong rồi" */}
          <Text style={[styles.title, { color: colors.text }]}>{t('auth.resetSuccessTitle')}</Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('auth.resetSuccessSubtitle')}</Text>
        </View>

        {/* Nút "Vào Nooka" ở đáy */}
        <View style={styles.bottomSection}>
          <Button
            accessibilityLabel={t('auth.enterNookaBtn')}
            label={t('auth.enterNookaBtn')}
            onPress={handleEnter}
            style={[styles.enterButton, { backgroundColor: colors.inverseSurface }]}
            tone="primary"
          />
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  checkCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  bottomSection: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  enterButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
  },
});
