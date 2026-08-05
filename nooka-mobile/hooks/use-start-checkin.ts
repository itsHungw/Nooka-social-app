import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { useNookaDemo } from '@/providers/nooka-demo-provider';
import { t } from '@/lib/i18n';

/**
 * Bấm + lần đầu thì hỏi quyền vị trí trước, đúng như prototype.
 *
 * Dùng `Alert` của hệ thống thay vì tự vẽ hộp thoại: prototype vẽ lại dialog
 * iOS chỉ vì nó chạy trong trình duyệt. Ở đây quyền vị trí thật vẫn sẽ do OS
 * hỏi, nên hộp thoại giả cũng nên trông như hộp thoại thật.
 *
 * §13 của spec: không có real-time location tracking. Đây chỉ là một lần hỏi
 * lúc người dùng chủ động check-in, không có background location.
 */
export function useStartCheckin() {
  const router = useRouter();
  const { locationAsked, allowLocation, denyLocation, startDraft } = useNookaDemo();

  return useCallback(() => {
    const open = () => {
      startDraft();
      router.push('/create');
    };

    if (locationAsked) {
      open();
      return;
    }

    Alert.alert(t('permission.title'), t('permission.body'), [
      { text: t('permission.deny'), style: 'cancel', onPress: () => { denyLocation(); open(); } },
      { text: t('permission.allow'), onPress: () => { allowLocation(); open(); } },
    ]);
  }, [allowLocation, denyLocation, locationAsked, router, startDraft]);
}
