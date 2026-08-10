import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { t } from '@/lib/i18n';
import { useNookaDemo } from '@/providers/nooka-demo-provider';

export function useExitCheckin() {
  const router = useRouter();
  const demo = useNookaDemo();

  return useCallback(() => {
    if (!demo.hasDraftChanges) {
      router.dismissAll();
      return;
    }

    Alert.alert(t('draft.exitTitle'), t('draft.exitBody'), [
      { text: t('draft.continueEditing'), style: 'cancel' },
      {
        text: t('draft.discard'),
        style: 'destructive',
        onPress: () => {
          demo.discardDraft();
          router.dismissAll();
        },
      },
      {
        text: t('draft.save'),
        onPress: () => {
          void demo.saveDraft().then(() => router.dismissAll());
        },
      },
    ]);
  }, [demo, router]);
}
