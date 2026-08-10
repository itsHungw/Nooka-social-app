import { Redirect } from 'expo-router';

import { useAuthSession } from '@/providers/auth-session-provider';

/**
 * Trang điểm vào gốc (`/`) khi mở ứng dụng.
 * Mặc định chuyển hướng người dùng tới màn hình Bắt đầu (`/welcome`).
 */
export default function Index() {
  const { isLoading, user } = useAuthSession();

  if (isLoading) return null;

  return <Redirect href={user ? '/(tabs)' : '/welcome'} />;
}
