# Tab Tìm dùng Google Places — Design

Ngày: 2026-08-06
Phạm vi: `nooka-mobile/` (một mình). Không đụng `nooka-api/`, không đụng `nooka-docs/`.

## Vấn đề

Tab Tìm (`app/(tabs)/search.tsx`) đang hiển thị 4 địa điểm hard-code trong
`features/nooka/spots.ts` với toạ độ cố định ở Bình Thạnh. Người dùng muốn
bản đồ hiển thị địa điểm thật từ Google Places xung quanh vị trí hiện tại.

## Phạm vi chốt

- **Google Places chỉ ở tab Tìm.** Mọi nơi khác trong app — feed, saved,
  profile, check-in flow (`create → pin → caption`), `app/spot/[id].tsx` —
  vẫn dùng 4 chỗ giả trong `features/nooka/spots.ts`. Lý do: 8 method của
  `useNookaDemo` (`toggleSave`, `toggleBeen`, `setDraftSpot`,
  `openReviewFor`, …) nhận `SpotId` literal; mở rộng thành string sẽ phá
  25 file.
- **`USER_LOCATION` vẫn là hằng số.** §13 cấm real-time tracking. Không gọi
  `expo-location`, không thêm permission.
- **Không thêm dependency.** `react-native-maps` đã có, `expo-constants` đã
  có (`~18.0.13`), `fetch` có sẵn trong RN 0.81.

## Kiến trúc

### File mới

- `features/nooka/places-source.ts` — module thuần, không React.
  - `export type GooglePlace = { placeId, name, vicinity, lat, lng, types, rating?, userRatingsTotal?, icon?, iconBackgroundColor?, openNow? }`
  - `export interface SpotSource { nearby(center, opts): Promise<{ places: GooglePlace[]; source: 'google' | 'empty' }> }`
  - `export class GooglePlacesSource implements SpotSource { constructor(apiKey: string) }`
  - `export function createSource(): SpotSource` — đọc key từ
    `Constants.expoConfig.extra.GOOGLE_PLACES_KEY`. Thiếu key → throw
    `Error('GOOGLE_PLACES_KEY missing')`. Trả `EmptySource` khi không có
    key để app vẫn mở được.
  - `class EmptySource implements SpotSource { nearby() { return Promise.resolve({ places: [], source: 'empty' as const }) } }`

### File mới

- `features/nooka/use-nearby-places.ts` — hook React.
  - `useNearbyPlaces(center: Coordinate, radius: number): { places, loading, error, source }`
  - `useState` cho data/loading/error.
  - `useEffect` gọi `source.nearby()` khi `(center, radius)` đổi. Cleanup
    với `cancelled` flag để tránh setState khi unmount.
  - In-memory cache: `Map<string, { ts: number, data }>`, TTL 5 phút, key
    `${lat.toFixed(4)},${lng.toFixed(4)},${radius}`. Đặt ở module scope
    (không trong hook) để cache chia sẻ giữa các lần mount.
  - Không retry, không debounce. `USER_LOCATION` cố định nên `useEffect`
    chạy 1 lần.

### Sửa file có sẵn

- `app/(tabs)/search.tsx`:
  - Import `useNearbyPlaces`. Lấy `places` thay cho `results` map từ
    `SPOT_IDS`. State `sort`, `activeTags`, `visitedOnly` chỉ áp được khi
    đang ở chế độ "demo" — Google Places không trả tag Nooka nên chip lọc
    chuyển sang lọc theo `types` (cafe, restaurant, park, …).
  - Hiển thị 2 trạng thái rõ: `loading` (spinner nhỏ ở top), `error`
    (banner 1 dòng tiếng Việt, không chi tiết HTTP).
  - `NookaMap` nhận thêm prop `pins: GooglePlacePin[]`. `GooglePlacePin`
    = `{ placeId, coordinate, name }`. Component overlay phụ thuộc thêm
    cả `pins` lẫn `spots`.
- `components/nooka/nooka-map.tsx`:
  - Thêm prop `pins?: GooglePlacePin[]`. Overlay mới render cả hai bộ.
  - Pin Google: **một pin số** ở giữa viewport đếm số quán trong
    viewport. Click → `animateToRegion` tới bounding box của các pin đó
    (lấy từ `regionFor(coords)` có sẵn trong `features/nooka/geo.ts`).
    Lý do: AGENTS.md cảnh báo "vài ghim thì không thấy; hàng trăm ghim
    thì phải làm lại". 60 quán × overlay re-render mỗi region change là
    rủi ro thật, chưa kể tap target đè lên nhau.
- `app.config.js`:
  - Đọc thêm `process.env.GOOGLE_PLACES_KEY`, tiêm vào `extra` khi có.
  - Pattern giống phần `GOOGLE_MAPS_ANDROID_KEY` đã có sẵn.
- `locales/en.json`, `locales/vi.json`:
  - Thêm key `search.googleError`, `search.googleLoading`, `search.empty`,
    `map.types.cafe`, `map.types.restaurant`, `map.types.park`.
  - Không hardcode tiếng Việt trong JSX.

## Luồng dữ liệu

```
mount của tab Tìm
  → useNearbyPlaces(USER_LOCATION, 2000)
  → GooglePlacesSource.nearby()
  → fetch https://maps.googleapis.com/maps/api/place/nearbysearch/json
       ?location=10.8014,106.7109
       &radius=2000
       &key=$GOOGLE_PLACES_KEY
  → parse JSON, lọc field optional rỗng
  → cache 5 phút
  → setPlaces
  → render: NookaMap.pins + sheet ResultRow
```

## Quyết định kỹ thuật & lý do

| Quyết định | Lý do |
|---|---|
| `fetch` thuần, không wrapper | Repo chưa có HTTP layer. 1 endpoint. Wrapper là over-engineer. |
| Cache in-memory, không AsyncStorage | `USER_LOCATION` cố định. Reload app = cache cold, không sao. |
| Không retry / backoff | Google trả `status` trong body, không phải HTTP 5xx. Hiển thị error banner, người dùng tự refresh. |
| Không pagination (`next_page_token`) | 60 quán đầu đủ cho viewport 2 km. |
| Pin Google là 1 số cluster | Tránh re-render 60 overlay mỗi region change. |
| Chip lọc đổi sang `types` Google | 4 chỗ giả có tag Nooka; quán Google không có. Đổi nghĩa chip thay vì bỏ. |
| Không dùng `expo-location` | §13 cấm real-time tracking. |
| Đọc key qua `Constants.expoConfig.extra` | Pattern chuẩn Expo SDK 54. `app.config.js` đã có sẵn đường đọc env, copy từ phần `GOOGLE_MAPS_ANDROID_KEY`. |
| Thiếu key → `EmptySource` | App vẫn mở, tab Tìm hiển thị "Chưa cấu hình Google Places", không crash. |

## Lệch luật AGENTS.md — chấp nhận

`nooka-mobile/AGENTS.md` nói "Context7 là bắt buộc". Session này không có
Context7 MCP server. Dùng `WebFetch` với URL chính thức:
- `https://docs.expo.dev/versions/latest/sdk/constants.md`
- `https://developers.google.com/maps/documentation/places/web-service/legacy/search-nearby`

Mọi số liệu trong spec đối chiếu trực tiếp source code repo (file:line)
trước khi viết. Khi nào Context7 MCP được cấu hình, nên rerun fact-check.

## Không làm (YAGNI)

- Debounce / throttle (vì `USER_LOCATION` cố định).
- Retry với backoff (Google trả status, không phải HTTP).
- AsyncStorage cache.
- Pagination với `next_page_token`.
- Thêm thư viện wrapper (`react-native-google-places-autocomplete` đã có
  tiền sử lỗi RN 0.81/Fabric — không xác minh được, không thêm risk).
- Mở rộng `SpotId` thành string.
- Thêm backend proxy.
- Đụng `nooka-api/`, `nooka-docs/`.
- Bỏ `useThemeColor` / `useNookaTheme` — đã có sẵn.
- Viết lại `NookaMap` từ đầu — chỉ thêm prop.

## Test

Một file `features/nooka/places-source.test.ts` chạy bằng `node --test`:

```bash
node --test features/nooka/places-source.test.ts features/nooka/places-source.ts
```

(Pattern này khớp AGENTS.md ghi: "Truyền cả thư mục thay vì từng file thì
Node trên Windows báo `Cannot find module` — kể tên file ra.")

Mock `fetch` bằng `globalThis.fetch = async () => stub`. Test:

1. `GooglePlacesSource.nearby` ghép URL đúng với key.
2. Parse response `OK` với `results` thành `GooglePlace[]` — mất field optional rỗng.
3. Trả về `error_message` khi `status != OK`.
4. `EmptySource.nearby` trả `{ places: [], source: 'empty' }`.
5. Cache: gọi 2 lần cùng key, fetch chỉ chạy 1 lần.

Không viết integration test với Google thật.

## Trước khi báo xong

Ba lệnh chuẩn từ AGENTS.md phải sạch:
```bash
npm run lint
npx tsc --noEmit
npx expo-doctor
```

## Files liên quan (evidence)

- `D:/Works_space/Nooka-social-app/nooka-mobile/features/nooka/spots.ts:86-164` — 4 spot giả, `SPOT_IDS` tuple, `SPOTS` record.
- `D:/Works_space/Nooka-social-app/nooka-mobile/features/nooka/spots.ts:219-231` — pattern sort `SPOTS_BY_*`.
- `D:/Works_space/Nooka-social-app/nooka-mobile/features/nooka/geo.ts` — `regionFor`, `regionAround`, `distanceMeters` pure functions.
- `D:/Works_space/Nooka-social-app/nooka-mobile/providers/nooka-demo-provider.tsx:95-209` — 8 method nhận `SpotId`, lý do giữ giả.
- `D:/Works_space/Nooka-social-app/nooka-mobile/app/(tabs)/search.tsx:44-246` — UI hiện tại.
- `D:/Works_space/Nooka-social-app/nooka-mobile/components/nooka/nooka-map.tsx:30-50` — comment về overlay view vs `<Marker>`.
- `D:/Works_space/Nooka-social-app/nooka-mobile/app.config.js:14-33` — pattern đọc env đã có.
- `D:/Works_space/Nooka-social-app/nooka-mobile/components/nooka/ui.tsx:192-246` — `ResultRow` slot cho cả Nooka lẫn Google.
- `D:/Works_space/Nooka-social-app/nooka-mobile/package.json:20-43` — deps đã có, không thêm mới.

## Câu hỏi mở cần bạn xác nhận

- "Pin đơn giản" mình hiểu là **một pin số cluster** ở giữa viewport.
  Nếu ý bạn là mỗi quán một pin riêng (có icon Google trả về) thì đây
  là vấn đề hiệu năng và cần Reanimated, đề xuất spec sẽ đổi.