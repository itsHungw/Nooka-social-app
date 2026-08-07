import { Redirect } from 'expo-router';

/**
 * Trang điểm vào gốc (`/`) khi mở ứng dụng.
 * Mặc định chuyển hướng người dùng tới màn hình Bắt đầu (`/welcome`).
 */
export default function Index() {
  return <Redirect href="/welcome" />;
}
