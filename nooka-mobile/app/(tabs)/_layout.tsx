import { Redirect, Tabs } from 'expo-router';

import { NookaTabBar } from '@/components/nooka/nooka-tab-bar';
import { t } from '@/lib/i18n';
import { useAuthSession } from '@/providers/auth-session-provider';

export default function TabLayout() {
  const { isLoading, user } = useAuthSession();

  if (isLoading) return null;
  if (!user) return <Redirect href="/welcome" />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <NookaTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: t('navigation.home') }} />
      <Tabs.Screen name="search" options={{ title: t('navigation.search') }} />
      <Tabs.Screen name="messages" options={{ title: t('navigation.messages') }} />
      <Tabs.Screen name="saved" options={{ title: t('navigation.saved') }} />
      <Tabs.Screen name="profile" options={{ title: t('navigation.profile') }} />
    </Tabs>
  );
}
