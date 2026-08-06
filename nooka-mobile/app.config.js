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
 *
 * `GOOGLE_PLACES_KEY` cũng đi qua file này: tiêm vào `extra` để
 * `Constants.expoConfig.extra.GOOGLE_PLACES_KEY` trả về giá trị lúc
 * runtime. Thiếu key → `createSource()` trả `EmptySource` (xem
 * `features/nooka/places-source.ts`) và tab Tìm vẫn mở được.
 */
module.exports = ({ config }) => {
  const androidKey = process.env.GOOGLE_MAPS_ANDROID_KEY;
  const iosKey = process.env.GOOGLE_MAPS_IOS_KEY;
  const placesKey = process.env.GOOGLE_PLACES_KEY;

  const plugins = config.plugins ?? [];
  if (androidKey || iosKey) {
    plugins.push([
      'react-native-maps',
      {
        ...(androidKey ? { androidGoogleMapsApiKey: androidKey } : {}),
        ...(iosKey ? { iosGoogleMapsApiKey: iosKey } : {}),
      },
    ]);
  }

  plugins.push([
    'expo-location',
    {
      locationWhenInUsePermission:
        'Allow $(PRODUCT_NAME) to use your location while you explore nearby places.',
    },
  ]);

  const extra = {
    ...(config.extra ?? {}),
    ...(placesKey ? { GOOGLE_PLACES_KEY: placesKey } : {}),
  };

  return {
    ...config,
    plugins,
    extra,
  };
};
