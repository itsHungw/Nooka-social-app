// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const i18next = require('eslint-plugin-i18next');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'app-example/*'],
  },
  {
    // Phụ lục A của spec: mọi chuỗi hiển thị phải đi qua i18n layer.
    // `jsx-text-only` chỉ bắt text người dùng nhìn thấy, không bắt mọi literal
    // trong file — đủ để chặn cái sai thật mà không tạo ồn.
    files: ['**/*.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': ['error', { mode: 'jsx-text-only' }],
    },
  },
  {
    // Light/dark mode: màu phải đến từ `constants/theme.ts` qua `useThemeColor`,
    // không viết cứng trong component. Màu cứng không đổi theo theme — nó chỉ
    // đúng ở một trong hai chế độ và không ai nhận ra cho tới khi mở chế độ kia.
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['constants/theme.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
          message:
            'Màu cứng. Thêm token vào constants/theme.ts (cả light lẫn dark) rồi đọc qua useThemeColor.',
        },
      ],
    },
  },
]);
