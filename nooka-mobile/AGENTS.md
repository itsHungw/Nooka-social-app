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

UI hiện tại dựng từ prototype `Nooka - prototype.dc.html` (Claude Design). Bốn tab và nút + ở giữa:

| Route | Là gì |
|---|---|
| `app/(tabs)/index.tsx` | Feed check-in, dải bạn bè, sheet chọn tag sau khi đăng |
| `app/(tabs)/search.tsx` | Tab **Tìm**: bản đồ thật + sheet ba điểm dừng + universal search |
| `app/(tabs)/saved.tsx`, `profile.tsx` | Muốn đi, và trang cá nhân |
| `app/ask.tsx` | Hỏi Nooka — câu hỏi tự do hoặc intent, ra kết quả xếp hạng |
| `app/spot/[id].tsx` | Trang địa điểm |
| `app/create.tsx` → `app/pin.tsx` → `app/caption.tsx` | Luồng check-in: camera → sửa địa điểm → caption → đăng |
| `app/review.tsx`, `app/story/[index].tsx` | Ba câu review, và xem check-in của bạn bè |

**Tên route `ask` không đổi tuỳ tiện được.** `(tabs)` là group nên `app/(tabs)/search.tsx` đã chiếm `/search`; đặt màn Hỏi Nooka ở `app/search.tsx` là hai file cùng trỏ một đường dẫn. Đó là lý do nó tên `ask.tsx`.

Trạng thái dùng chung nằm ở `providers/nooka-demo-provider.tsx`, không phải ở từng màn hình. Xếp hạng của "Hỏi Nooka" nằm ở `features/nooka/ranking.ts`, phần địa lý ở `geo.ts`, linh vật ở `mascot.ts`, biểu cảm ở `mood.ts`, màn kịch leo lên ở `ascent.ts` với hai đạo cụ `ladder.ts` và `balloon.ts` — đều là hàm thuần, test chạy bằng:

```bash
node --test features/nooka/ranking.test.ts features/nooka/geo.test.ts features/nooka/mascot.test.ts features/nooka/ascent.test.ts features/nooka/ladder.test.ts features/nooka/balloon.test.ts features/nooka/mood.test.ts
```

(Truyền cả thư mục thay vì từng file thì Node trên Windows báo `Cannot find module` — kể tên file ra.)

**Danh sách kết quả chỉ có một component.** `ResultRow` ở `components/nooka/ui.tsx` dùng chung cho sheet của tab Tìm và kết quả Hỏi Nooka. §5 của spec chốt một loại card cho cả hai chế độ — dựng thêm hàng riêng cho một bề mặt là phá luật đó.

**Khớp từ khoá đi qua locale, không hardcode tiếng Việt trong logic.** `search.synonyms.<tagId>` ở `locales/` là danh sách từ đồng nghĩa; `ranking.ts` chỉ nhận danh sách đó chứ không biết mình đang khớp ngôn ngữ nào.

Code trong scaffold (`hello-wave`, `parallax-scroll-view`...) là **demo của template**, không phải kiến trúc đã chốt. Xoá khi thay bằng màn hình thật; `npm run reset-project` dọn một lượt.

## Bản đồ

`react-native-maps` 1.20.1 — bản khớp SDK 54, có New Architecture, và **chạy được trong Expo Go** nên không ai phải dựng development build. Đừng đổi sang `expo-maps`: nó còn alpha và **không** chạy trong Expo Go, tức là đổi xong cả team mất khả năng mở app — đúng cái luật số một ở trên chặn.

- `components/nooka/nooka-map.tsx` là chỗ duy nhất chạm `MapView`. Màn khác cần bản đồ thì dùng component này.
- `components/nooka/fake-map.tsx` vẫn còn, nhưng **chỉ** cho màn đặt pin lúc check-in. Đó là bản đồ trang trí, không phải bản đồ thật.
- Style bản đồ dựng từ token theme ở `features/nooka/map-style.ts`. Không có hex nào trong đó — bản đồ đổi theo light/dark như mọi bề mặt khác. `customMapStyle` chỉ ăn với `PROVIDER_GOOGLE`.
- **Không dùng `<Marker>` có view con.** Trên Android + New Architecture, nội dung ghim bị xén theo một khổ cố định: mất nửa phải của tên và mất luôn mép bo. Đây là lỗi thư viện — [issue #5877](https://github.com/react-native-maps/react-native-maps/issues/5877), đúng tổ hợp Expo SDK 54 / RN 0.81 / Fabric, đã bị đóng "not planned". Cách duy nhất issue đó nêu là tắt New Architecture, mà Expo Go bản SDK 54 chỉ chạy New Architecture. Đã thử và **không** ăn thua: giữ `tracksViewChanges={true}` mãi, và đóng cứng width/height đo được — cả hai đều vẫn bị xén, vì đây là lỗi đo chứ không phải lỗi thời điểm chụp. iOS không dính nên đừng tin vào việc "máy mình nhìn ổn".
- Nên ghim là **view thường trong lớp phủ trên bản đồ**, chiếu toạ độ sang pixel theo `region`. Đánh đổi: ghim bám `onRegionChange` nên vuốt rất nhanh có thể trễ một nhịp. Vài ghim thì không thấy; hàng trăm ghim thì phải làm lại chỗ này.
- **Prop chỉ đọc lúc mount không đáng tin.** `initialRegion` bị bỏ qua khi `MapView` remount (đổi theme làm remount vì Android không áp lại `customMapStyle`), do Fabric tái dùng view trong pool — bản đồ hiện ra ở camera thừa kế của view cũ. Khôi phục bằng `onMapReady`, đừng tin `initialRegion`.
- Vùng khởi tạo là bán kính quanh người dùng, **không** phải `regionFor` ôm hết địa điểm: màn hình cao và hẹp nên Google nới bề dọc cho vừa bề ngang rồi làm tròn lên mức zoom kế tiếp, kết quả là lùi ra tận Long An và ghim dồn thành một cục.
- Toạ độ địa điểm nằm ở `features/nooka/spots.ts`; `distanceM` **tính từ toạ độ**, không viết tay. Sửa toạ độ là khoảng cách tự đúng theo.

**API key.** Expo Go không cần key. Build độc lập thì cần, và key **không được commit** — `app.config.js` đọc từ `GOOGLE_MAPS_ANDROID_KEY` / `GOOGLE_MAPS_IOS_KEY` và chỉ thêm plugin khi có. Đặt qua `eas secret:create` hoặc `.env.local`.

**Vị trí người dùng.** Tab Search dùng `expo-location` để đọc GPS foreground khi màn hình đang mở và cập nhật chấm xanh theo chuyển động. Không đăng ký background location, không lưu lịch sử di chuyển, không gửi tọa độ định kỳ hay gửi tọa độ lên server. `showsUserLocation` vẫn để tắt vì chấm xanh được vẽ bằng lớp phủ Nooka; `nooka-map.tsx` nhận tọa độ live qua prop.

Sheet ba điểm dừng ở `components/nooka/bottom-sheet.tsx` dùng gesture-handler + Reanimated, nên `GestureHandlerRootView` phải ở `app/_layout.tsx`. Bỏ nó ra thì cử chỉ im lặng không chạy, không có lỗi nào hiện.

## Linh vật

Có **hai** linh vật, làm hai việc khác nhau — đừng gộp:

- `components/nooka/nooka-mascot.tsx` — ảnh xuất từ clip, đứng yên ở thanh "Hỏi Nooka" ngoài Home. Là nhãn thương hiệu.
- `components/nooka/nooka-sprite.tsx` — Nooka pixel, chạy theo trạng thái ở thanh nhắn tin của `app/ask.tsx`. Báo **máy đang làm gì**: vẫy tay khi chờ, cầm kính lúp khi đọc review, reo khi có kết quả, rồi đứng im.

**Chỗ ở của Nooka là bên trái ô nhập, không phải sau ô nhập.** Ở `app/ask.tsx` nó có hai chỗ đứng (`MascotSpot`): `beside` — đứng trọn con bên trái ô nhập, và `behind` — nấp sau ô nhập rồi thò lên theo tư thế bốc thăm (`PeekPose`). Vào màn là đứng bên trái vẫy tay; thỉnh thoảng nó ra sau ô nhập một lát rồi **về lại bên trái**. `HOME_DWELL` khoá điều đó: mỗi lượt nấp luôn ngắn hơn một lượt đứng nhà, có test giữ.

Chỉ đi trốn **lúc đang chờ** (`isWaiting`). Người dùng hỏi một câu là `useMascotStage` đưa nó về bên trái, không đợi hết lượt — nấp sau ô nhập mà suy nghĩ hay reo mừng thì không ai thấy nó đang làm gì, mà đó mới là việc của con sprite này.

**Lên xuống chỉ được diễn ở sau ô nhập.** Đường đi nằm ở `nextStage`, là hàm thuần và có test: từ nhà chỉ chui được sang bám mép ô nhập chứ không chìm thẳng, và đang chìm thì phải trồi lên tại chỗ rồi mới đi về. Ba đoạn `MASCOT_MOVE` (`walk` → `lift` → `dip`) chạy nối tiếp, không chồng nhau: đi ngang vào sau ô nhập rồi mới nhô lên, hạ xuống hết rồi mới đi về. Cho chạy song song thì Nooka đi chéo và cú lên xuống rơi ra ngay bên trái ô nhập — chỗ chẳng có gì che, thành ra nhân vật hiện ra từ hư không.

**Ô nhập không đổi kích cỡ.** Chỗ của Nooka chừa cứng bằng `paddingLeft` trong `inputRow`. Nooka đi hay trốn thì ô nhập và nút gửi vẫn đứng yên — ô nhập co giãn theo bước chân của một món trang trí là thứ mắt bắt được ngay.

Hai chỗ đó là **hai điểm neo của cùng một lớp phủ**, đi lại bằng phép dịch. Dựng hai nơi riêng thì lúc chuyển là một con biến mất và một con hiện ra — người xem không đọc ra đó là cùng một nhân vật.

**Gõ quá dài thì Nooka phải leo lên mới nhìn qua được.** Ô nhập là multiline nên nó cao dần theo số dòng. Tới dòng thứ ba thì mép trên vượt hẳn tầm với và Nooka chìm nghỉm sau bức tường chữ. Lúc đó nó lấy một đạo cụ từ mép trái màn hình, lên tới mép, **nhảy sang bám vào khung ô nhập**, rồi treo ở đó nhìn qua.

- **Có hai phương tiện, bốc thăm mỗi lượt**: vác thang tới dựa vào khung rồi trèo, hoặc tóm một quả bóng bay rồi để nó nhấc lên. `pickMeans` ở `features/nooka/ascent.ts`. Cố định một màn kịch thì tới lần thứ ba người dùng thôi không nhìn nữa. Hai cách đi **chung một đường và chung một máy trạng thái** — chỉ khác đạo cụ, tư thế và nhịp.
- Máy trạng thái tám chặng ở `ascent.ts`, chạy bằng `hooks/use-nooka-ascent.ts`. **Đường về đi ngược đúng đường lên**, không có lối tắt: từ `away` không nhảy thẳng tới `gripping`, và buông khung là phải nhảy về đạo cụ trước chứ không rơi thẳng xuống đất. Đó là thứ giữ cho đạo cụ không biến mất dưới chân Nooka lúc người dùng xoá bớt chữ. Có test khoá cả hai chiều.
- `hopping` **dùng chung cho cả hai chiều**. Chiều nào là do ý định lúc đó quyết định, không phải do tên chặng — nhờ vậy người dùng đổi ý ngay giữa cú nhảy thì Nooka quay đầu tại chỗ.
- **Đường đi thẳng đứng cho chiếc thang.** Thang nhôm được dựng thẳng đứng bên cạnh ô nhập, Nooka trèo thẳng đứng lên theo thân thang rồi mới nhảy bám sang mép ô nhập.
- **Nooka dừng thấp hơn đầu đạo cụ một quãng** (`climbStop`) rồi mới nhảy. Chỗ ở của nó rộng đúng bằng chính nó, nên trèo tới sát đầu thang là đã lọt nửa người ra sau ô nhập và cú nhảy chỉ còn là một cú trượt ngang mắt không đọc ra.
- **Ô nhập cao thêm giữa chừng thì thang không dài ra.** Kích thước đạo cụ chốt lúc mở màn; Nooka lên hết đạo cụ, bám vào khung rồi **bò dọc mép** theo `rim`. Một chiếc thang đang có người đứng trên không tự mọc thêm bậc dưới chân họ.
- **Nooka tự quyết định lúc nào xuống, không đợi người dùng gửi tin.** Treo trên khung một lúc thì tụt xuống nghỉ, nghỉ chán thì leo lại. `possible` truyền vào `useNookaAscent` là **hoàn cảnh** (ô nhập còn cao), còn ý định nằm trong hook. Đồng hồ chỉ chạy ở hai chặng nghỉ (`ascentResting`) — bấm giờ lúc mới có ý định thì quãng leo ăn mất một phần lượt treo. Lượt treo **luôn** dài hơn lượt nghỉ (`PERCH_DWELL.min > GROUND_DWELL.max`), cùng luật với `HOME_DWELL`/`PEEK_DWELL`.
- **Biểu cảm buồn ngủ đếm theo thời gian người dùng để yên**, từ phím gõ cuối cùng (`useNookaMood`), **không** theo chặng của màn kịch leo. Đó là cách phá vòng phụ thuộc: màn kịch leo cần biết Nooka còn thức không (`restless`) để đứng yên khi nó ngủ, nên cơn buồn ngủ phải tính được trước. Lim dim thì biểu cảm chỉ nằm ở **đôi mắt**, `perch` chọn tư thế thân — nhờ vậy một tâm trạng dùng được cả lúc bám khung lẫn lúc đứng dưới đất mà không phải vẽ hai bộ nhân vật. Có test khoá việc thân không đổi giữa khung thức và khung lim dim.
- **Ngủ là ngồi, ở đâu cũng vậy.** Không ai ngủ trong lúc treo người bằng hai bàn tay, nên tới mức `sleep` Nooka đu lên **ngồi hẳn lên mép ô nhập** và dùng chung bộ khung với lúc ngồi dưới đất. Quãng nhấc người là `SIT_LIFT` ở `app/ask.tsx`, đúng bằng khoảng mà tư thế treo thấp hơn mép. Tư thế ngồi đọc ra được là nhờ **hình dáng chân đế** — bè ngang, hai bàn chân duỗi ra trước — chứ không phải nhờ hạ chiều cao: lưới chỉ có 44 hàng và cái đầu chibi đã chiếm 20, hạ nhiều hàng thì nửa dưới nén thành mấy sợi mảnh. `SIT_DROP` là **một** hàng.
- **Đang ngủ thì không đổi ý.** `restless` tắt là Nooka đứng nguyên chỗ đang ở. Thiếu vế này thì người dùng để yên một lúc là có một nhân vật vừa ngủ vừa trèo thang lên xuống.
- Nooka **không được đi lang thang khi đạo cụ còn trên màn hình**. `useMascotStage` phải tắt cả lúc mới có ý định (để kịp đi về chỗ ở) lẫn suốt lúc đạo cụ còn đó (để không trượt ngang ra khỏi thang lúc đang tụt). Xem `app/ask.tsx`.
- **Quả bóng neo vào bàn tay, không vào tâm nhân vật.** `BALLOON_HAND` / `BALLOON_HAND_GRIP` ở `balloon.ts` là hàng/cột của **đệm bàn tay trong lưới sprite**, đã tính 3 hàng headroom mà `liftFrame` chèn vào — quên phần đó là đáy dây rơi vào bụng, dây chui sau thân và quả bóng trông như bị cắm vào người. Có test khoá đúng ô neo là ô đệm bàn tay, ở cả khung bay lẫn khung bám khung.
- **Bóng ngả quanh chính bàn tay** (`BALLOON_LEAN`, xoay quanh đáy ảnh). Bàn tay giơ lên nằm lọt trong bóng của cái đầu, nên một sợi dây thẳng đứng sẽ chui sau đầu rồi biến mất. Ngả ra thì cả đoạn dây chạy ngoài thân và mắt đọc ra ngay là nó đang được cầm.
- **Đạo cụ không có file khung hình sinh sẵn** — khác linh vật. Kích thước chỉ biết lúc chạy, nên `ladderRows`/`balloonRows` dựng lưới đúng cỡ cần và ô pixel luôn vuông. Kéo dãn một khung hình cố định là ô thành hình chữ nhật dẹt và cả món đồ hết là pixel art. Xem bằng mắt: `node scripts/preview-props.ts /tmp/p.json && node scripts/preview-mascot-sprite.js /tmp/p.json /tmp/p.png`.
- **Ba lưới pixel dùng chung một bảng màu ở công cụ xem**, nên ký tự của chúng không được đụng nhau (trừ `o` viền và `h` đốm sáng, cùng nghĩa ở cả ba). Có test khoá.
- Ngưỡng lấy từ **chiều cao thật của ô nhập** (`onLayout`), không phải số ký tự — xuống dòng, dán một đoạn dài hay đổi cỡ chữ hệ thống đều làm ô nhập cao lên và chỉ chiều cao mới kể đúng cả ba.
- `spritePaths` nhận bảng màu qua tham số nên thang và bóng dùng chung thuật toán gộp dải với linh vật. Chép nó sang file thứ hai thì đến lúc sửa cách gộp sẽ có một bản bị bỏ quên.

**Chi thì phải liền thân, và nối bằng `stitch` chứ không bằng cách nới chi ra.** Chi và thân đều bo góc, nên ở mấy hàng bo giữa chúng hở ra đúng một ô trong suốt và cánh tay đọc thành một khối rời lơ lửng. Cách sửa hiển nhiên — nới cánh tay cho cắm vào thân — **làm cánh tay to lên**, vì `blob` bo góc theo bề ngang nên đổi bề ngang là đổi luôn dáng nhìn thấy. Đã thử và bị trả lại. `stitch(g, y0, y1)` lấp đúng ô hở bằng màu viền, dáng không suy suyển một ô. Nó chỉ lấp **một ô** — hở rộng hơn nghĩa là đặt sai chỗ chứ không phải khe bo góc, lấp đi là giấu mất lỗi thật. Có test quét mọi khung nghỉ tìm ô trong suốt kẹp giữa hai mảng đặc; ngoại lệ duy nhất là khe ngăn cổ áo với áo choàng — cố ý, xem ghi chú trong `cape`.

**Khung hình sinh tự động.** `features/nooka/mascot-frames.ts` là file sinh ra, đừng sửa tay — lệch một cột là hỏng cả hình mà nhìn code không thấy. Sửa hình thì sửa `scripts/build-mascot-sprite.js` rồi chạy `node scripts/build-mascot-sprite.js`. Xem lại bằng mắt trước khi commit:

```bash
node scripts/build-mascot-sprite.js /tmp/f.json && node scripts/preview-mascot-sprite.js /tmp/f.json /tmp/f.png
```

**Vẽ bằng SVG, không phải View.** Một khung hình có ~150 dải pixel; vẽ bằng `View` là 150 view dựng lại ba lần mỗi giây cho một món trang trí. `spritePaths` gộp theo màu ra ~13 `Path`, cả con linh vật còn một view native. `react-native-svg` 15.12.1 có sẵn trong Expo Go nên không cần development build.

**Reo mừng phải hữu hạn.** `MASCOT_ANIMATION.found` chạy 3 vòng rồi tự chuyển sang `resting`. Một linh vật nhảy không ngừng cạnh ô nhập là thứ người ta tắt app vì nó. Component cũng tôn trọng "giảm chuyển động" của hệ thống — bật lên là đứng khung đầu.

## Hỏi Nooka là một đoạn chat

`app/ask.tsx` giữ một mảng lượt nói, không phải một lần hỏi–đáp. Lý do là **trí nhớ**: tag của lượt trước còn hiệu lực nên hỏi tiếp là thu hẹp thêm, không phải hỏi lại từ đầu.

**Lượt của Nooka chỉ được nói nó vừa làm gì** — đọc bao nhiêu review, hiểu ra tag nào, còn mấy chỗ. Mọi câu mô tả một quán phải nằm trong `ResultRow` hoặc ô trích dẫn, và phải thuộc về một người có tên. Thêm một câu kiểu "chỗ này hợp để làm việc" vào bong bóng là phá đúng thứ §6.2 khoá, dù nghe thân thiện hơn.

## Light/dark mode

App khai `userInterfaceStyle: "automatic"` để chế độ **Theo hệ thống** có thể phản ứng với cài đặt của thiết bị. Người dùng có ba lựa chọn trong `Cài đặt > Giao diện`: `system`, `light`, và `dark`; mặc định lần đầu là `system`.

Preference được quản lý tập trung bởi `providers/nooka-theme-provider.tsx`, lưu bằng AsyncStorage với key `@nooka/theme-preference`, và được đọc qua `useNookaTheme()`. Không đọc `useColorScheme()` trực tiếp trong màn hình hoặc component; hook hệ thống chỉ thuộc về provider. Theme phải đổi ngay khi người dùng chọn và vẫn giữ sau khi mở lại app.

Bảng màu nằm ở `constants/theme.ts`, chia hai khối `light` và `dark`. **Mọi token phải có mặt ở cả hai khối** — thiếu một bên là lỗi lúc chạy chứ không phải lúc build.

Đọc màu bằng một trong hai đường, không có đường thứ ba:

```tsx
useThemeColor({ light: ..., dark: ... }, 'text')   // hook, khi cần màu lẻ
<ThemedText> / <ThemedView>                        // component, cho hầu hết trường hợp
```

**Không viết màu cứng trong component.** Màu cứng chỉ đúng ở một trong hai chế độ, và không ai phát hiện ra cho tới khi có người mở chế độ còn lại. Luật này được eslint chặn (`no-restricted-syntax` bắt literal dạng `#rrggbb`); `constants/theme.ts` là nơi duy nhất được miễn trừ. Danh sách miễn trừ cho màn hình demo của template đã được xoá — mọi file đều bị kiểm.

Ba nhóm token cần biết trước khi thêm màu: `inverseSurface`/`onInverse` cho nút chính (light là mực trên kem, dark thì lật lại), `camera*` cho ba màn luôn tối bất kể theme (camera, caption, story), và `photo*` là tint nền giả cho ảnh chưa tải.

**Cái bẫy đã cắn một lần:** React Native flatten mảng `style` từ trái sang phải, style sau đè style trước. Một `color` nằm trong `StyleSheet.create` đặt sau `{ color }` lấy từ theme sẽ nuốt luôn màu theme mà không báo gì. Đây đúng là lỗi từng có ở `components/themed-text.tsx` với `type="link"`. Khi trộn theme color và `StyleSheet`, kiểm thứ tự trong mảng.

**Trước khi báo xong một màn hình, xem nó ở cả light lẫn dark.** Screenshot một chế độ không chứng minh được gì về chế độ kia.

## i18n — từ commit đầu tiên

Phụ lục A của spec: locale gốc là `en`, **mọi chuỗi phải qua i18n layer, không hardcode**.

Không viết chuỗi hiển thị thẳng vào JSX, kể cả tiếng Anh, kể cả "tạm thời". Retrofit i18n sau khi có 20 màn hình là công việc đắt và nhàm nhất trong dự án.

## Privacy — không được lười ở đây

- **R1: EXIF strip nằm ở server.** Client không được coi là đã sạch. Không viết code giả định ảnh gửi lên đã hết metadata, và không quảng cáo với user rằng đã xoá.
- **Location privacy:** foreground GPS chỉ chạy khi tab Search đang mở và user đã cấp quyền. Không thêm background location, không gửi tọa độ định kỳ lên backend, không log tọa độ, không lưu lịch sử di chuyển. Khi rời tab, subscription phải được remove.
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
