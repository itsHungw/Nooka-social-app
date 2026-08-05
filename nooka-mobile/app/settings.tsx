import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ThemeOption } from '@/components/nooka/theme-option';
import { CircleButton, ScreenShell } from '@/components/nooka/ui';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();

  return (
    <ScreenShell testID="settings-screen">
      <View style={styles.header}>
        <CircleButton accessibilityLabel={t('common.back')} icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.title, { color: colors.text }]}>{t('settings.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.appearance')}</Text>
        <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
          {t('settings.appearanceDescription')}
        </Text>
      </View>

      <View accessibilityRole="radiogroup" style={styles.options}>
        <ThemeOption
          description={t('settings.systemDescription')}
          icon="phone-portrait-outline"
          label={t('settings.system')}
          value="system"
        />
        <ThemeOption
          description={t('settings.lightDescription')}
          icon="sunny-outline"
          label={t('settings.light')}
          value="light"
        />
        <ThemeOption
          description={t('settings.darkDescription')}
          icon="moon-outline"
          label={t('settings.dark')}
          value="dark"
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '800' },
  headerSpacer: { width: 38, height: 38 },
  sectionHeader: { marginTop: 22, maxWidth: 360 },
  sectionTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  sectionDescription: { marginTop: 5, fontSize: 12, lineHeight: 18 },
  options: { marginTop: 20, gap: 10 },
});
