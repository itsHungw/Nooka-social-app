import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

import en from '@/locales/en.json';

/**
 * Locale gốc là `en` — Phụ lục A của product spec.
 *
 * Thêm ngôn ngữ: tạo `locales/<mã>.json`, import vào đây và thêm vào object
 * bên dưới. Không cần dịch đủ key; key nào thiếu sẽ rơi về `en` nhờ
 * `enableFallback`.
 *
 * Nội suy dùng `{{tên}}`. Số nhiều dùng cặp `one`/`other` và truyền `count`.
 */
const i18n = new I18n({ en });

i18n.defaultLocale = 'en';
i18n.enableFallback = true;

// ponytail: locale chốt một lần lúc khởi động. Đổi ngôn ngữ trong Settings của
// máy sẽ chỉ có hiệu lực sau khi mở lại app — Android không tự reset JS context.
// Nâng lên listener AppState khi có người thật sự phàn nàn.
i18n.locale = getLocales()[0]?.languageCode ?? 'en';

export const t = i18n.t.bind(i18n);

export default i18n;
