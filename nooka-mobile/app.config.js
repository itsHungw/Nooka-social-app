/**
 * Config động chồng lên `app.json`.
 *
 * Lý do tồn tại: API key của Google Maps **không được commit** (luật "Không
 * commit" trong `AGENTS.md`), mà `app.json` là JSON tĩnh nên không đọc được
 * biến môi trường. File này đọc từ env và chỉ thêm plugin khi có key.
 *
 * Dev bằng Expo Go thì không cần key — Expo Go đã có sẵn Google Maps SDK.
 * Key chỉ cần khi build độc lập:
 *
 *   EAS:   eas secret:create --name GOOGLE_MAPS_ANDROID_KEY --value <key>
 *   Máy:   đặt trong `.env.local` (đã nằm trong .gitignore)
 */
module.exports = ({ config }) => {
  const androidKey = process.env.GOOGLE_MAPS_ANDROID_KEY;
  const iosKey = process.env.GOOGLE_MAPS_IOS_KEY;

  if (!androidKey && !iosKey) return config;

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        'react-native-maps',
        {
          ...(androidKey ? { androidGoogleMapsApiKey: androidKey } : {}),
          ...(iosKey ? { iosGoogleMapsApiKey: iosKey } : {}),
        },
      ],
    ],
  };
};
