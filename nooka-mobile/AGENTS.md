# AGENTS.md

Quy tắc cho mọi agent và mọi người làm việc trong `nooka-mobile`.

## Phạm vi

- Chỉ sửa trong `nooka-mobile/`. Không tự ý đụng `../nooka-api` hoặc `../nooka-docs`.
- Chạy `git status --short` trước khi sửa. Không xoá, ghi đè hay hoàn tác thay đổi chưa commit của người khác.
- Không tạo commit, branch hay worktree nếu chưa được yêu cầu.
- Ưu tiên thay đổi nhỏ, sửa nguyên nhân gốc, giữ nguyên quy ước hiện có.

## Luật số một: không nâng Expo SDK

Project ghim **SDK 54**. Đây không phải "phiên bản cũ cần cập nhật" — đây là ràng buộc.

Expo Go trên App Store và Play Store chỉ chạy **đúng một SDK tại một thời điểm**, và hiện tại là 54 trong khi SDK mới nhất đã là 57. Nâng SDK nghĩa là app không mở được trên điện thoại của cả team cho tới khi ai đó dựng development build.

Nguồn sự thật, kiểm trước khi động vào bất kỳ version nào:

```bash
curl -s https://api.expo.dev/v2/versions | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).expoGoSdkVersion))"
```

Trường `expoGoSdkVersion` là con số duy nhất quyết định. Tài liệu, blog và câu trả lời của LLM đều không thay được nó.

**Cấm:**

- `npx expo install --fix` chạy mù khi chưa biết mình đang sửa gì.
- `npm update`, `npm install <pkg>@latest` cho package thuộc hệ Expo/React Native.
- Sửa tay số version trong `package.json`.
- **`npm audit fix --force`.** `npm audit` hiện báo 13 moderate + 1 high (`postcss`, `@expo/prebuild-config` qua `expo-splash-screen`). Tất cả là công cụ build, không nằm trong bundle gửi lên điện thoại, và `--force` sẽ nâng version vượt SDK 54 — phá đúng luật này. Con số đó là đã biết và chấp nhận; đọc lại khi nâng SDK.

**Nâng SDK là quyết định của cả team**, không phải việc dọn dẹp tiện tay. Khi làm: đọc release notes, `npx expo install --fix`, `npx expo-doctor`, và chạy thử trên máy thật trước khi merge.

## Thêm package

```bash
npx expo install <package>     # đúng
npm install <package>          # sai, với mọi package thuộc hệ Expo/RN
```

`expo install` chọn version khớp SDK 54. `npm install` lấy `latest` và làm vỡ build theo kiểu chỉ lộ ra lúc chạy trên máy thật.

`newArchEnabled: true` đang bật. Thư viện native chưa hỗ trợ New Architecture sẽ **vỡ lúc chạy, không phải lúc cài** — kiểm compat trước khi thêm.

Không thêm dependency nếu Expo SDK hoặc React Native đã có sẵn giải pháp đủ dùng.

## Context7 là bắt buộc

Khi làm việc với framework, thư viện, SDK hay API, đọc tài liệu hiện hành bằng Context7 **trước** khi viết code.

1. `resolve-library-id` với tên chính thức và toàn bộ câu hỏi kỹ thuật.
2. Ưu tiên tài liệu đúng phiên bản. Với Expo: `/expo/expo` có branch `sdk-54`; `/websites/expo_dev` là tài liệu chung.
3. `query-docs` với câu hỏi cụ thể, không truy vấn một từ chung chung.
4. Đối chiếu tài liệu với `package.json` và source hiện tại trước khi sửa.
5. Không nâng version chỉ vì tài liệu có bản mới hơn.

Không cần Context7 cho refactor thuần nội bộ, business logic riêng của Nooka, hay đọc hiểu source hiện có.

## Nguồn sự thật

1. Yêu cầu trực tiếp của người dùng.
2. Product spec: `../nooka-docs/product/specs/2026-07-27-nooka-design.md`.
3. OpenAPI contract: `../nooka-docs/contracts/` (chưa có).
4. Source và config hiện tại.

Tài liệu mâu thuẫn với code đang chạy thì nêu rõ mâu thuẫn, đừng âm thầm chọn một bên.

## Nền tảng

Expo SDK 54, React Native, React, expo-router, TypeScript `strict`. **Version cụ thể đọc từ `package.json`** — không chép số vào file này, chép là để nó mục.

- `npm` là package manager (có `package-lock.json`). Không trộn yarn/pnpm/bun.
- Alias `@/*` trỏ về gốc project.
- Máy dev là Windows; build iOS đi qua EAS cloud (§20 của spec).

## Lệnh chuẩn

```bash
npx expo start        # dev server, quét QR bằng Expo Go
npm run lint
npx tsc --noEmit
npx expo-doctor
```

**Trước khi tuyên bố xong, ba lệnh cuối phải sạch.** Không báo hoàn thành dựa trên "code trông đúng".

`lint` và `tsc` đã được git hook chặn ở pre-commit, nhưng hook phải bật một lần cho mỗi clone — xem `AGENTS.md` ở repo gốc.

## Cấu trúc

`app/` là route — expo-router dùng file-based routing, mỗi file là một màn hình. `components/`, `hooks/`, `constants/` cho phần dùng lại.

Màn hình theo §10 của spec: Home (feed), Create, Search, Saved, Profile, Place detail.

Code trong scaffold (`explore.tsx`, `hello-wave`, `parallax-scroll-view`, `modal.tsx`...) là **demo của template**, không phải kiến trúc đã chốt. Xoá khi thay bằng màn hình thật; `npm run reset-project` dọn một lượt.

## Light/dark mode

App khai `userInterfaceStyle: "automatic"` để chế độ **Theo hệ thống** có thể phản ứng với cài đặt của thiết bị. Người dùng có ba lựa chọn trong `Cài đặt > Giao diện`: `system`, `light`, và `dark`; mặc định lần đầu là `system`.

Preference được quản lý tập trung bởi `providers/nooka-theme-provider.tsx`, lưu bằng AsyncStorage với key `@nooka/theme-preference`, và được đọc qua `useNookaTheme()`. Không đọc `useColorScheme()` trực tiếp trong màn hình hoặc component; hook hệ thống chỉ thuộc về provider. Theme phải đổi ngay khi người dùng chọn và vẫn giữ sau khi mở lại app.

Bảng màu nằm ở `constants/theme.ts`, chia hai khối `light` và `dark`. **Mọi token phải có mặt ở cả hai khối** — thiếu một bên là lỗi lúc chạy chứ không phải lúc build.

Đọc màu bằng một trong hai đường, không có đường thứ ba:

```tsx
useThemeColor({ light: ..., dark: ... }, 'text')   // hook, khi cần màu lẻ
<ThemedText> / <ThemedView>                        // component, cho hầu hết trường hợp
```

**Không viết màu cứng trong component.** Màu cứng chỉ đúng ở một trong hai chế độ, và không ai phát hiện ra cho tới khi có người mở chế độ còn lại. Luật này được eslint chặn (`no-restricted-syntax` bắt literal dạng `#rrggbb`); `constants/theme.ts` là nơi duy nhất được miễn trừ.

**Cái bẫy đã cắn một lần:** React Native flatten mảng `style` từ trái sang phải, style sau đè style trước. Một `color` nằm trong `StyleSheet.create` đặt sau `{ color }` lấy từ theme sẽ nuốt luôn màu theme mà không báo gì. Đây đúng là lỗi từng có ở `components/themed-text.tsx` với `type="link"`. Khi trộn theme color và `StyleSheet`, kiểm thứ tự trong mảng.

**Trước khi báo xong một màn hình, xem nó ở cả light lẫn dark.** Screenshot một chế độ không chứng minh được gì về chế độ kia.

## i18n — từ commit đầu tiên

Phụ lục A của spec: locale gốc là `en`, **mọi chuỗi phải qua i18n layer, không hardcode**.

Không viết chuỗi hiển thị thẳng vào JSX, kể cả tiếng Anh, kể cả "tạm thời". Retrofit i18n sau khi có 20 màn hình là công việc đắt và nhàm nhất trong dự án.

## Privacy — không được lười ở đây

- **R1: EXIF strip nằm ở server.** Client không được coi là đã sạch. Không viết code giả định ảnh gửi lên đã hết metadata, và không quảng cáo với user rằng đã xoá.
- **§13: không có real-time location tracking.** Không thêm background location, không gửi toạ độ định kỳ. Vị trí chỉ được đọc khi user chủ động chọn địa điểm.
- Nội dung `PRIVATE` không vào log, analytics, crash report hay context gửi cho AI.
- Không log token, không log toạ độ, không log nội dung bài viết.

## Auth

Firebase Auth phát hành token; gửi kèm request bằng `Authorization: Bearer`. Không tự xây login/password, không thêm màn hình đăng ký bằng mật khẩu.

Không dùng `userId` phía client làm định danh tin cậy — backend map từ token đã verify. Client giữ id chỉ để hiển thị.

## API

Code-first: `nooka-api` sinh `openapi.json` → commit vào `../nooka-docs/contracts/` → mobile generate TypeScript client từ đó.

**Không viết tay type hay DTO cho response API.** Chưa có contract thì chưa gọi API thật — dựng UI với dữ liệu giả trong file riêng, đừng phát tán type đoán mò khắp codebase.

## Không commit

`.env*.local`, `google-services.json`, `GoogleService-Info.plist`, `*.jks`, `*.p8`, `*.p12`, keystore, EAS credential. Secret chỉ đến từ environment hoặc EAS secrets.

`/ios` và `/android` là thư mục sinh tự động (CNG) và đang được gitignore. Không chạy `expo prebuild` rồi commit kết quả — làm thế là bỏ managed workflow mà không ai quyết định điều đó.

## Cập nhật file này

Khi đổi SDK, thêm dependency nền tảng, chốt thêm một quy ước, hoặc khi một luật ở đây không còn đúng. Luật sai còn tệ hơn không có luật — nó dạy người đọc rằng file này không đáng tin.
