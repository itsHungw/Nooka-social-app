import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemeOption } from '@/components/nooka/theme-option';
import { Button, CircleButton, ScreenShell } from '@/components/nooka/ui';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useNookaTheme();

  return (
    <ScreenShell testID="settings-screen">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
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

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.preview')}</Text>
        </View>

        <View style={styles.options}>
          <Button label={t('settings.welcomeScreen')} onPress={() => router.push('/welcome')} tone="outline" />
          <Button label={t('settings.loginScreen')} onPress={() => router.push('/login')} tone="outline" />
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingBottom: 24 },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 4 },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '800' },
  headerSpacer: { width: 38, height: 38 },
  sectionHeader: { marginTop: 14, maxWidth: 360 },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: '800' },
  sectionDescription: { marginTop: 4, fontSize: 12.5, lineHeight: 17 },
  options: { marginTop: 16, gap: 10 },
});
