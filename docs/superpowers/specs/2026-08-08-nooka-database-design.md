# Thiết kế database Nooka — mô hình đích

**Ngày:** 2026-08-08
**Phạm vi:** toàn bộ mô hình dữ liệu của `nooka-api`, suy ra từ nhu cầu thật của `nooka-mobile` và ràng buộc của product spec.
**Trạng thái:** đã chốt, chưa triển khai.

---

## 1. Vì sao có tài liệu này

`V1__baseline.sql` phủ được vòng lặp cốt lõi ở §10: đăng bài gắn place, feed, want-to-go, been, follow-up link, privacy per post. Nhưng frontend đã dựng thêm nhiều màn hình vượt ra ngoài đó, và mười một nhóm chức năng của nó hiện không có bảng nào đỡ.

Tài liệu này định nghĩa **mô hình đích đầy đủ** cho cả mười một nhóm, rồi chia thành năm migration độc lập. Mục tiêu không phải làm hết ngay, mà là biết trước hình dạng cuối để mỗi bước không phải đập đi làm lại.

### Nguồn sự thật đã đối chiếu

| | Nguồn |
|---|---|
| 1 | Yêu cầu trực tiếp của người dùng trong phiên brainstorm này |
| 2 | `nooka-docs/product/specs/2026-07-27-nooka-design.md` |
| 3 | `nooka-docs/architecture/2026-07-28-nooka-api-architecture.md` |
| 4 | `nooka-api/src/main/resources/db/migration/V1__baseline.sql` |
| 5 | Source thật của `nooka-mobile` |

---

## 2. Khoảng trống giữa frontend và database

| # | Frontend cần | Bằng chứng | DB hiện tại | Kết quả |
|---|---|---|---|---|
| 1 | Nhắn tin | `app/(tabs)/messages.tsx`, `app/chat/[id].tsx` | không có | cấp bảng — giai đoạn 5 |
| 2 | Review có cấu trúc | `app/review.tsx`, `spot.whatPeopleSay` | không có | cấp bảng — giai đoạn 2 |
| 3 | Tag tổng hợp theo spot | `features/nooka/spots.ts` `tags[]`, `fit{}` | chỉ có `post_vibe_tags` per-post | cấp bảng — giai đoạn 2 |
| 4 | Chỉ số spot | `checkins`, `reviews`, `friends`, `isNew`, `hasReview` | không có | tính qua `insight`, không cấp bảng |
| 5 | Place từ Google | `features/nooka/places-source.ts`, `app/pin.tsx` nhánh `fromMaps` | không có | **loại** — §7 và ToS của Google |
| 6 | Giờ mở cửa | `spots.*.open`, `openNow` | không có | cấp bảng — giai đoạn 1 |
| 7 | Profile mở rộng | `app/edit-profile.tsx` có bio + location | `users` thiếu cột | vá cột — giai đoạn 1 |
| 8 | Friend request | `app/add-friends.tsx` `Add → Requested` | `follows` một chiều tức thì | **loại** — §3 |
| 9 | `live` "đang ở quán" | `features/nooka/spots.ts:169` | không có | **loại** — §13 |
| 10 | Share map | `app/share-map.tsx` ba mức riêng tư | không có | cấp bảng — giai đoạn 3 |
| 11 | Hỏi Nooka | `app/ask.tsx` giữ mảng lượt nói | không có | cấp bảng — giai đoạn 3 |

Chín nhóm được cấp bảng, hai nhóm bị loại có lý do ở §3 dưới đây.

---

## 3. Ba mâu thuẫn giữa prototype và spec

Prototype đi trước spec ở ba chỗ. `AGENTS.md` gốc yêu cầu nêu rõ mâu thuẫn thay vì âm thầm chọn một bên. Cả ba đã được người dùng quyết: **theo spec**.

### 3.1 Friend request — spec thắng

§3 chốt:

> *"Không có friend request hai chiều. Lý do: cơ chế đó tạo cold start rất nặng và giới hạn Nooka thành một group chat có hình ảnh."*

Không có bảng `friend_requests`. Nút `Add → Requested` ở `app/add-friends.tsx` phải đổi thành follow tức thì.

Hai thứ trông giống friend request nhưng không phải, và cả hai đều **suy ra được**, không cần bảng:

- `mutual` count = số người mà cả tôi và họ cùng follow — một câu đếm trên `follows`.
- Mục "Requests" ở tab Messages = **message request**, tức người tôi không follow nhắn tôi. Xử lý bằng cột `conversation_members.accepted_at`, xem §7.5.

### 3.2 Hiện diện vị trí — spec thắng, nhưng tách làm hai khái niệm

§13 chốt:

> *"Bản đầu chốt: cho phép ẩn thời gian, và **không hiển thị 'đang ở đây'**."*

Prototype trộn hai khái niệm khác nhau vào một cờ `FRIENDS[].live`:

| Chỗ dùng | Ý nghĩa | Kết luận |
|---|---|---|
| `features/nooka/spots.ts:169` — dải story, chú thích *"còn đang ở đó"* | hiện diện **vị trí** | **bỏ** — §13 cấm |
| `app/chat/[id].tsx:45` — `isOnline`, `chat.onlineNow` | hiện diện **ứng dụng** | **giữ** — không đụng §13 |

Hiện diện ứng dụng không vào PostgreSQL. Xem §5.5.

### 3.3 Google Places — spec thắng, và có thêm sức nặng pháp lý

§7 chốt:

> **User-created + seed thủ công. Không dùng Google Places API làm nguồn dữ liệu gốc.**
> *"Google Places autocomplete chỉ được thêm sau, như tiện ích tìm kiếm, không phải nguồn lưu trữ."*

Nhưng `features/nooka/places-source.ts` đang gọi Google Places nearby và trả về `name`, `vicinity`, `lat`, `lng`, `rating`, `openNow` để vẽ ghim; `app/pin.tsx` có nhánh `fromMaps`.

Bốn nhóm rủi ro nếu giữ:

1. **Vi phạm hợp đồng, và mất nhiều hơn Places.** Google Maps Platform ToS §3.2.3 cấm "No Scraping" và "No Caching". Ngoại lệ hẹp: `place_id` được lưu vô thời hạn, phần Content còn lại thì không. Key và billing project là một, nên bị đình chỉ là mất luôn bản đồ (`components/nooka/nooka-map.tsx`) và mất luôn module `directions` đang chạy.
2. **Xoá mất moat.** §12 nói moat số 2 là *"metadata có cấu trúc từ lần đi thật"*, kèm nhận định *"Google Maps review dạng văn xuôi không trích xuất được ở quy mô"*.
3. **Sai định vị.** §1 chốt Nooka *"không phải Google Maps thay thế"*.
4. **Chi phí.** Nearby Search tính phí mỗi lượt gọi, và bản đồ bắn theo mỗi lần đổi vùng.

**Hệ quả lên schema:**

- Không bảng mirror. Không cột nào lưu `name`, `address`, `rating`, `openNow`, hay toạ độ lấy từ Google.
- `spots.source` chỉ có hai giá trị `USER_CREATED` và `SEEDED`. Việc **không** có giá trị `GOOGLE` trong `check` chính là thứ chặn người sau vô tình thêm vào.
- Giờ mở cửa là bảng của Nooka, do user và chủ quán đóng góp — xem §5.4.
- Nếu sau này thêm Google autocomplete như §7 cho phép, giới hạn tối đa được lưu là **một cột `places.google_place_id`** làm con trỏ chống trùng. Không hơn.

### 3.4 Ai được tạo spot

Ý "chỉ chủ quán được tạo spot" nhìn đúng vấn đề (user tạo tự do sinh rác và bản trùng) nhưng làm gãy ba thứ:

| Gãy ở đâu | Vì sao |
|---|---|
| §11 cold start | Kế hoạch là seed tay 300–500 place bởi một nhóm nhỏ. Đội seed không phải chủ quán. |
| Vòng lặp cốt lõi §1 | `Someone goes somewhere → Posts it in a few taps`. Check-in bắt buộc có spot. |
| §1 "Không phải là gì" | *"Không phải nền tảng review doanh nghiệp."* |

§12 giai đoạn 1 đã có sẵn lời giải, và nó là **claim, không phải create**:

> *"Nooka for Business — MIỄN PHÍ. Quán claim trang... Mục tiêu: 200 quán claim... và **nó làm sạch dữ liệu địa điểm giúp bạn**."*

Chốt: **user tạo spot + chống trùng tự động lúc tạo + chủ quán claim sau.** Xem §5.3 và §8.

---

## 4. Quyết định kiến trúc

### 4.1 Một database PostgreSQL

Đã cân nhắc tách PostgreSQL cho auth và MongoDB cho social. **Loại**, ba lý do:

**R2 không sống được.** `post/repository/PostVisibilityRules.java:22` sinh ra một câu SQL duy nhất ghép `posts` với `follows`, `close_friends`, `blocks`. Tách kho thì câu đó thành nhiều lượt hỏi rồi ghép ở tầng ứng dụng, và tính đúng đắn rời khỏi database. Nặng nhất là `CLOSE_FRIENDS`: điều kiện `cf.owner_id = p.author_id and cf.friend_id = :viewer` là tra **ngược** — trong SQL, subquery bám vào `p.author_id` nên chỉ kiểm số tác giả có trong trang kết quả; tách ra thì phải nạp trước toàn bộ tập, không có chặn trên.

**Đường chia đặt sai chỗ.** Auth là phần nhỏ nhất và ít traffic nhất. Ngược lại `users` bị đẩy sang phía sai của ranh giới: mọi màn hình xã hội đều cần `display_name`, `username`, `avatar_url`. Hoặc nhân bản (hai nguồn sự thật — đúng cái `V1__baseline.sql:112` cảnh báo *"lưu thừa thì sẽ có ngày lệch"*), hoặc N+1 qua mạng.

**Dữ liệu là quan hệ.** `follows`/`close_friends`/`blocks` là cạnh many-to-many; tag count là `GROUP BY`; `spot.friends` là join `been × follows` khác nhau theo người xem; `inspired_by_post_id` là cạnh đồ thị tự tham chiếu.

Nhu cầu "schema linh hoạt" giải bằng `jsonb` + GIN, nhu cầu không gian giải bằng PostGIS — cả hai đã có trong PostgreSQL.

**Chỗ đúng để tách sau này**, nếu đo được nhu cầu thật: `messages` là domain duy nhất chỉ ghi thêm và không tham gia join visibility. Redis đã đang được dùng đúng cách cho cache route preview.

### 4.2 PostGIS

Bật extension `postgis` và `pg_trgm`.

Chi phí: đổi image ở hai chỗ, `infra/compose.yaml` và `src/test/java/com/vinhung/nookaapi/TestcontainersConfiguration.java`, từ `postgres:17-alpine` sang `postgis/postgis:17-3.5-alpine` (178MB). Image nặng hơn nên lần chạy test đầu lâu hơn.

Bản `-alpine` được chọn thay cho `postgis/postgis:17-3.5` vì nó nhỏ hơn đáng kể và khớp quy ước image đang có của dự án (`postgres:17-alpine`, `redis:7-alpine`).

Không thêm dependency Java. Các truy vấn không gian chạy bằng native query; Hibernate không cần hiểu kiểu `geography`.

### 4.3 Cách tính số liệu tổng hợp: đếm lúc đọc, qua một cửa có tên

Ba cách đã cân:

| | Cách | Nhanh | Sai được không | Thêm chỉ số mới |
|---|---|---|---|---|
| A | Đếm lúc cần | chậm dần khi lớn | không bao giờ | dễ |
| B | Cột counter trong bảng nguồn | nhanh nhất | **sai âm thầm** | phải sửa mọi đường ghi |
| C | Bảng projection + domain event | nhanh | dựng lại được | dễ |

**Chốt cách A**, kèm một điều kiện: không màn hình nào gọi thẳng câu đếm. Tất cả đi qua interface `insight.SpotStats`, cùng khuôn `PostAccess` đã dùng cho visibility. Khi đo được chậm, thay implementation bằng bảng projection — nơi gọi không đổi một dòng.

Loại B vì nó khó rút lui nhất: counter đã nằm trong `spots` thì gỡ ra là migration đau, mà ở quy mô §12 giai đoạn 0 (2–3 quận) nó không nhanh hơn A đáng kể.

Chưa làm C vì đó là over-engineering cho một app chưa mở. Hạ tầng đã sẵn: `V2__modulith_event_publication.sql` có registry, nhưng grep `ApplicationEventPublisher` và `@ApplicationModuleListener` trong `src/main/java` hiện không ra kết quả nào.

**Ngoại lệ:** `been` không phải số liệu tổng hợp. §8 chốt nó là *trạng thái* bật tự động khi đăng bài. Ghi thẳng, cùng transaction với post.

**Nơi cách A sẽ hết chịu nổi đầu tiên:** xếp hạng của Hỏi Nooka, không phải trang cá nhân hay trang quán — xem §9.2. Khi cần nâng cấp, `spot_tag_stats` là bảng đầu tiên phải dựng.

### 4.4 Khoá chính: UUID v7, riêng `posts` có thêm `public_id`

V1 dùng `gen_random_uuid()` = UUID v4 ngẫu nhiên hoàn toàn. Ở bảng ghi nhiều, mỗi lần chèn rơi vào một trang lá ngẫu nhiên của B-tree: toàn bộ index phải nằm trong bộ nhớ mới nhanh, trang tách liên tục, WAL phồng vì phải ghi nguyên trang sau checkpoint.

UUID v7 nhét mốc thời gian vào đầu nên chèn dồn về mép phải.

PostgreSQL 17 **không có** `uuidv7()` (hàm đó vào từ PG18), nên sinh ở Java. Đã xác minh bằng Context7 trên `/hibernate/hibernate-orm`:

- `Style.TIME` → `CustomVersionOneStrategy` = **UUID v1, nhúng địa chỉ IP/MAC**. Không phải v7. **Không được dùng** trong một app lấy privacy làm ràng buộc sản phẩm.
- `Style.VERSION_7` → `UuidVersion7Strategy` (RFC 9562). Đang đánh dấu `@Incubating`.
- Mặc định `AUTO` = `RANDOM` = v4.

Sửa ở đúng một chỗ, `shared/entity/BaseEntity.java`:

```java
@Id
@UuidGenerator(style = UuidGenerator.Style.VERSION_7)
private UUID id;
```

Không cần migrate dữ liệu: dòng cũ giữ v4, dòng mới nhận v7, cả hai đều hợp lệ. Cột vẫn giữ `default gen_random_uuid()` làm lưới an toàn cho seed script viết bằng SQL thuần — nơi tính cục bộ của index không quan trọng.

**Xung đột với `hide_time`.** UUID v7 kể ra thời điểm tạo vì mốc thời gian nằm ngay trong ID, mà `posts.hide_time` tồn tại để giấu đúng thứ đó, và ID nằm trong URL. Ba cách đã cân: `posts` giữ v4 (mất phần lợi lớn nhất), v7 hết và chấp nhận `hide_time` là trang trí (phá §13), hoặc tách ID nội bộ khỏi ID công khai.

**Chốt cách thứ ba:**

```sql
alter table posts add column public_id uuid not null default gen_random_uuid();
create unique index posts_public_id_key on posts (public_id);
```

`posts.id` (v7) chỉ dùng nội bộ và trong FK. `posts.public_id` (v4, ngẫu nhiên) là thứ duy nhất xuất hiện trong API và URL. Lợi thêm: không ai dò được số bài viết của hệ thống.

**Cần xác minh lại lúc triển khai:** `@UuidGenerator` được khai bằng `@IdGeneratorType` nên tự nó đủ làm generator, không cần kèm `@GeneratedValue`. Kiểm lại bằng Context7 trước khi sửa `BaseEntity`.

---

## 5. Kiến trúc module

### 5.1 Mười ba module

| Module | Bảng | Tình trạng |
|---|---|---|
| `shared` | — (`BaseEntity`, `Visibility`, khuôn lỗi) | có |
| `tag` | `tags`, `tag_translations` | **mới** |
| `auth` | `auth_sessions`, `oauth_accounts`, `email_verification_codes`, `password_reset_tokens` | có |
| `user` | `users`, `follows`, `close_friends`, `blocks` | có, vá cột |
| `spot` | `cities`, `areas`, `spots`, `places`, `experiences`, `spot_hours`, `spot_merge_candidates`, `spot_tag_fit` | có, thêm 3 bảng |
| `post` | `posts`, `post_media`, `post_vibe_tags`, `reactions`, `comments` | có, vá cột |
| `review` | `reviews`, `review_answers`, `review_questions`, `review_question_options` | **mới** |
| `insight` | **không bảng nào** | **mới** |
| `messaging` | `conversations`, `conversation_members`, `messages`, `message_invites` | **mới** |
| `discovery` | `selections`, `selection_items`, `topics`, `topic_translations`, `topic_spots`, `shared_links` | **mới** |
| `business` | `spot_claims`, `spot_managers` | **mới** |
| `moderation` | `reports` | có, sửa FK |
| `notification` | `notifications` | có, vá cột |
| `directions` | — (cache Redis) | có |

22 bảng đang có từ `V1__baseline.sql`, 21 bảng mới, tổng **43**. `post_vibe_tags` được dựng lại chứ không tính là mới. Bảng registry của Spring Modulith ở `V2` là hạ tầng, không nằm trong con số này.

### 5.2 Luật đọc một chiều

```
                    Controller / API
                          │
       ┌───────────┬──────┴──────┬────────────┐
       │           │             │            │
   discovery    insight      messaging    business
       │           │             │            │
       └─────┬─────┴──────┬──────┘            │
             │            │                   │
           post        review ────────────────┘
             │            │
             └──────┬─────┘
                    │
              ┌─────┴─────┐
             spot        user
              │           │
              └─────┬─────┘
                    │
                 shared   tag
```

Mũi tên chỉ đi xuống, không có vòng. `post` được đọc `spot` và `user`; `spot` không được đọc ngược lên `post`.

Đây không phải luật mới — dự án đang chạy đúng luật này, có ArchUnit canh. Tài liệu này mở rộng nó cho module mới.

Module trên cần dữ liệu module dưới thì đi qua một interface có tên, không nối JPA thẳng. Hai ví dụ đã có: `post.api.PostAccess` và `user.query.RelationshipCriteria`. Cấp database vẫn có foreign key thật — `posts.author_id references users` đã tồn tại ở V1; luật cấm là cấm `@ManyToOne` chéo module, không cấm FK.

### 5.3 Vì sao `insight` không có bảng nào

`checkinCount` đếm từ `post`, `reviewCount` đếm từ `review`, `friendCount` ghép `post` với `follows` của `user`. Ba module khác nhau. Để `spot` tự đi đếm thì `spot` phải đọc ngược lên `post`, tạo vòng.

`insight` nằm trên cả ba, đọc xuống cả ba, và là nơi duy nhất trả lời câu hỏi "quán này có bao nhiêu…".

```java
public interface SpotStats {
    SpotStatsView forViewer(UUID spotId, @Nullable UUID viewerId);
}

public record SpotStatsView(
    long checkinCount,
    long reviewCount,
    long friendCount,
    boolean isNew,
    boolean hasReview,
    List<TagStat> tags
) {}
```

`isNew` = `checkinCount <= 1`. `hasReview` = `reviewCount > 0`. Không cột nào trong database.

`friendCount` **phải** đếm qua một phương thức mới trên `PostAccess`:

```java
long countVisibleAtSpot(UUID spotId, @Nullable UUID viewerId);
```

Xem R3a ở §10.

### 5.4 Hiện diện ứng dụng không vào PostgreSQL

Chấm xanh "đang online" cần biết user hoạt động lần cuối lúc nào. Cột `users.last_seen_at` cập nhật mỗi request nghĩa là mỗi lần user chạm app là một lượt ghi vào bảng bận nhất hệ thống.

Để trong Redis (đã có, đang chạy cho cache route preview): khoá `presence:{userId}`, TTL 2 phút. Mất hết cũng không sao — dữ liệu tạm, không phải sự thật.

PostgreSQL chỉ giữ `users.show_activity_status`.

---

## 6. Giai đoạn 1 — `V3__foundation.sql`

Mở khoá: tạo quán có chống trùng, sửa hồ sơ, biết quán đang mở hay đóng.

### 6.1 Extension

```sql
create extension if not exists pg_trgm;
create extension if not exists postgis;
```

### 6.2 `users`

```sql
alter table users
    add column bio                  text,
    add column home_area_id         uuid references areas on delete set null,
    add column locale               varchar(5) not null default 'vi',
    add column show_activity_status boolean    not null default true,
    add column deleted_at           timestamptz,
    add column anonymized_at        timestamptz;

alter table users add constraint users_bio_length
    check (bio is null or length(bio) <= 300);
```

| Cột | Frontend cần ở đâu |
|---|---|
| `bio` | `profile.bio` — nhiều dòng |
| `home_area_id` | `editProfile.location` = *"Your district or city"*; `profile.meta` = *"Binh Thanh · joined Mar 2026"*. Nửa sau lấy từ `created_at` sẵn có |
| `locale` | Email xác thực và push notification do server gửi |
| `show_activity_status` | Công tắc tắt chấm xanh "đang online" |
| `deleted_at`, `anonymized_at` | Xoá tài khoản hai bước — xem §11.3 |

Không thêm counter. `128 check-in · 34 đã đi · 19 muốn đi` ở trang cá nhân đi qua `insight`.

Không lưu theme. Frontend đã chốt AsyncStorage khoá `@nooka/theme-preference`; đưa vào DB là hai nguồn sự thật.

### 6.3 `cities`

```sql
alter table cities add column timezone text not null default 'Asia/Ho_Chi_Minh';
```

Trang quán hiện `"Open · until 10pm"`. Muốn biết bây giờ có mở không thì phải so giờ hiện tại theo giờ địa phương của thành phố đó, không phải giờ server.

### 6.4 `spots` và `places` — nguồn gốc, chống trùng

```sql
alter table spots
    add column source text not null default 'USER_CREATED'
        check (source in ('USER_CREATED', 'SEEDED'));

-- Cột sinh tự động từ lat/lng, không ai ghi vào được nên không thể lệch.
alter table places add column geog geography(Point, 4326)
    generated always as (
        ST_SetSRID(ST_MakePoint(longitude::double precision,
                                latitude::double precision), 4326)::geography
    ) stored;

create index places_geog_idx     on places using gist (geog);
create index spots_name_trgm_idx on spots  using gin  (lower(name) gin_trgm_ops);
```

`latitude`/`longitude` vẫn là `numeric(9,6)` và vẫn là nguồn sự thật — lý do ở `V1__baseline.sql:194` không đổi.

Kiểm chống trùng chạy trước khi cho tạo spot:

```sql
select s.id, s.name, ST_Distance(p.geog, :newPoint) as distance_m
from spots s
join places p on p.spot_id = s.id
where s.merged_into_id is null
  and ST_DWithin(p.geog, :newPoint, 150)
  and similarity(lower(s.name), lower(:newName)) > 0.3
order by distance_m;
```

Ra kết quả thì hiện "Có phải bạn muốn nói quán này?" trước khi cho tạo. Đúng yêu cầu §7: *"so tên + tọa độ trong bán kính, gợi ý merge"*.

```sql
create table spot_merge_candidates (
    id              uuid primary key default gen_random_uuid(),
    -- Cặp luôn lưu theo thứ tự tăng dần để (A,B) và (B,A) không thành hai dòng.
    lower_spot_id   uuid not null references spots on delete cascade,
    higher_spot_id  uuid not null references spots on delete cascade,
    reason          text not null check (reason in ('NAME_AND_RADIUS', 'REPORTED', 'MANUAL')),
    distance_m      numeric(10, 2),
    name_similarity numeric(4, 3),
    status          text not null default 'PENDING'
        check (status in ('PENDING', 'MERGED', 'REJECTED')),
    detected_at     timestamptz not null default now(),
    resolved_at     timestamptz,
    resolved_by     uuid references users on delete set null,
    check (lower_spot_id < higher_spot_id),
    unique (lower_spot_id, higher_spot_id)
);

create index spot_merge_candidates_pending_idx on spot_merge_candidates (detected_at)
    where status = 'PENDING';
```

`check (lower_spot_id < higher_spot_id)` cộng `unique` khiến database tự chặn trùng cặp, không phải code Java nhớ mà chặn.

Bảng này cũng là chỗ dọn hậu quả của đua ghi — xem §11.4.

### 6.5 `spot_hours`

```sql
create table spot_hours (
    id          uuid primary key default gen_random_uuid(),
    spot_id     uuid not null references spots on delete cascade,
    day_of_week smallint not null check (day_of_week between 0 and 6),  -- 0 = Chủ nhật
    opens_at    time not null,
    -- closes_at < opens_at nghĩa là đóng cửa sau nửa đêm (mở 18:00, đóng 02:00).
    closes_at   time not null,
    source      text not null check (source in ('USER', 'OWNER', 'SEED')),
    updated_by  uuid references users on delete set null,
    updated_at  timestamptz not null default now(),
    unique (spot_id, day_of_week, opens_at)
);

create index spot_hours_spot_idx on spot_hours (spot_id, day_of_week);
```

Không có dòng cho một ngày nghĩa là đóng cửa ngày đó — không cần cột `is_closed`.

`source` tồn tại vì cùng một quán sẽ có giờ do user điền và giờ do chủ quán điền sau khi claim. Chủ đè user; luật đó ở service, cột này là thứ cho phép nó biết ai điền.

**Chỉ áp dụng cho `spots.kind = 'PLACE'`.** Experience có `starts_at`/`ends_at` riêng từ V1 vì nó là sự kiện có ngày giờ cụ thể, không phải lịch mở cửa hàng tuần. Ràng buộc này không diễn đạt được bằng constraint trên một bảng, nên ép ở service kèm test.

### 6.6 `post_media` — đặt sẵn cột cho luồng ảnh

```sql
alter table post_media
    add column status       text not null default 'READY'
        check (status in ('PENDING', 'PROCESSING', 'READY', 'FAILED')),
    add column storage_key  text,
    add column content_type text,
    add column bytes        bigint,
    add column checksum     text;
```

Xem §11.2 để hiểu vì sao có sẵn từ bây giờ dù giai đoạn đầu luôn ghi `READY`.

### 6.7 `posts` — ID công khai

```sql
alter table posts add column public_id uuid not null default gen_random_uuid();
create unique index posts_public_id_key on posts (public_id);
```

Xem §4.4.

### 6.8 `reports` — vá lỗ về an toàn

V1 đang có:

```sql
reporter_id uuid not null references users on delete cascade
```

Nghĩa là ai đó bị quấy rối, gửi báo cáo, rồi rời app vì quá mệt — bằng chứng đi theo họ và kẻ kia sạch hồ sơ.

```sql
alter table reports drop constraint reports_reporter_id_fkey;
alter table reports alter column reporter_id drop not null;
alter table reports add constraint reports_reporter_id_fkey
    foreign key (reporter_id) references users on delete set null;
```

### 6.9 `notifications` — tránh bẫy thêm cột theo từng loại

```sql
alter table notifications
    add column payload    jsonb       not null default '{}',
    add column group_key  text,
    add column updated_at timestamptz not null default now();

create unique index notifications_group_idx on notifications (recipient_id, group_key)
    where group_key is not null and read_at is null;
```

Giữ `actor_id`/`post_id`/`spot_id` làm cột thật vì chúng cần index và cần `on delete cascade`. Phần đặc thù từng loại (`conversation_id`, `claim_id`, `review_id`…) vào `payload`.

`group_key` cộng partial unique index chặn tình trạng 40 dòng thông báo cho một bài: "3 người đã thích bài của bạn" thay vì ba dòng.

---

## 7. Giai đoạn 2 — `V4__tags_and_reviews.sql`

Mở khoá: khép vòng lặp review → thẻ → xếp hạng. Đây là giai đoạn quan trọng nhất, đặt trước discovery vì §10 nói vòng lặp phải chứng minh được trước mọi thứ khác.

### 7.1 `tags`

`TAG_IDS` hiện là mảng cứng 10 phần tử trong `features/nooka/spots.ts:20`. Thêm một thẻ = sửa code + phát hành app.

```sql
create table tags (
    id          uuid primary key default gen_random_uuid(),
    slug        text not null unique,               -- 'quiet', 'workFriendly'
    kind        text not null check (kind in ('VIBE', 'FACILITY', 'PRICE', 'OCCASION')),
    pickable    boolean not null default true,      -- hiện trong sheet sau khi đăng
    sort_order  int not null default 0,
    archived_at timestamptz,
    created_at  timestamptz not null default now()
);
```

`archived_at` thay cho `DELETE`: thẻ cũ đã gắn vào hàng nghìn bài viết, xoá là mất lịch sử.

`pickable` khớp `PICKABLE_TAG_IDS` — 7 thẻ hiện trong sheet; `quietMusic`, `fast`, `takeaway` chỉ đến từ nơi khác.

### 7.2 `tag_translations` — và một quy ước bị thay đổi

```sql
create table tag_translations (
    tag_id   uuid       not null references tags on delete cascade,
    locale   varchar(5) not null,
    label    text       not null,
    synonyms text[]     not null default '{}',
    primary key (tag_id, locale)
);
```

Hiện `matchTags()` chạy trên điện thoại, đọc từ đồng nghĩa từ `locales/`. Nó chỉ xếp hạng được 4 quán hardcoded. Với 500 quán thật, xếp hạng **phải chạy ở server** — không thể tải toàn bộ dữ liệu về máy để xếp. Server xếp hạng thì server cần từ đồng nghĩa.

Đây là chỗ đi ngược một luật đang có trong `nooka-mobile/AGENTS.md`:

> *"`search.synonyms.<tagId>` ở `locales/` là danh sách từ đồng nghĩa; `ranking.ts` chỉ nhận danh sách đó chứ không biết mình đang khớp ngôn ngữ nào."*

**Ranh giới mới:** chữ của **giao diện** ở `locales/`; chữ của **dữ liệu** ở database. Nút "Muốn đi" là giao diện. Nhãn thẻ "Yên tĩnh" là dữ liệu, vì thẻ có thể thêm mà không phát hành app.

Việc cập nhật `nooka-mobile/AGENTS.md` là bắt buộc — xem §13.

### 7.3 `post_vibe_tags` — đổi từ chữ sang khoá

V1 lưu `tag text`. Chữ tự do nghĩa là `'quiet'`, `'Quiet'` và `'quite'` là ba thẻ khác nhau, không có gì chặn.

```sql
drop table post_vibe_tags;

create table post_vibe_tags (
    post_id uuid not null references posts on delete cascade,
    tag_id  uuid not null references tags  on delete restrict,
    primary key (post_id, tag_id)
);

create index post_vibe_tags_tag_idx on post_vibe_tags (tag_id);
```

`drop table` an toàn vì bảng chưa có đường ghi nào trong source hiện tại. Nếu tới lúc chạy migration mà đã có dữ liệu, thay bằng: tạo bảng mới, `insert ... select` ghép theo `slug`, rồi mới drop bảng cũ.

Giới hạn 3 thẻ mỗi bài (frontend `sheetTags.slice(0, 3)`) không diễn đạt được bằng constraint, nên ép ở service kèm test — cùng cách V1 xử lý ràng buộc "ít nhất một ảnh".

### 7.4 Review — bộ câu hỏi là dữ liệu, không phải code

Luật biến câu trả lời thành thẻ hiện nằm cứng trong `providers/nooka-demo-provider.tsx:177`:

```ts
if (prev.reviewAnswers.stay === 'no')     earned.push('workFriendly');
if (prev.reviewAnswers.price === 'cheap') earned.push('goodPrice');
```

§12 nói moat số 2 là *"metadata có cấu trúc từ lần đi thật — có ổ cắm không, giờ nào ồn, hai người hết bao nhiêu, hợp dịp gì"*. Bốn thứ, hiện mới hỏi được ba. Bộ câu hỏi sẽ đổi, nên nó phải là dữ liệu.

```sql
create table review_questions (
    id          uuid primary key default gen_random_uuid(),
    slug        text not null unique,          -- 'power' | 'stay' | 'price'
    answer_type text not null default 'SINGLE_CHOICE'
        check (answer_type in ('SINGLE_CHOICE')),
    sort_order  int not null default 0,
    archived_at timestamptz
);

create table review_question_options (
    id            uuid primary key default gen_random_uuid(),
    question_id   uuid not null references review_questions on delete cascade,
    value         text not null,               -- 'yes' | 'no' | 'cheap'
    sort_order    int not null default 0,
    -- Chọn đáp án này thì cộng một phiếu cho thẻ này. NULL = không sinh thẻ.
    -- Đây là chỗ thay cho hai dòng if cứng ở trên.
    grants_tag_id uuid references tags on delete set null,
    unique (question_id, value)
);

create table reviews (
    id         uuid primary key default gen_random_uuid(),
    spot_id    uuid not null references spots on delete cascade,
    author_id  uuid not null references users on delete cascade,
    body       text,
    -- Cho câu "You were here 2 hours, Tuesday afternoon" ở review.hereFor.
    visited_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    check (body is null or length(body) <= 500)
);

-- Một người một review cho mỗi quán, sửa được chứ không viết chồng.
create unique index reviews_author_spot_key on reviews (author_id, spot_id)
    where deleted_at is null;

create index reviews_spot_created_idx on reviews (spot_id, created_at desc)
    where deleted_at is null;

create table review_answers (
    review_id   uuid not null references reviews on delete cascade,
    question_id uuid not null references review_questions on delete restrict,
    option_id   uuid not null references review_question_options on delete restrict,
    primary key (review_id, question_id)
);
```

Thêm câu hỏi thứ tư "Wifi mạnh không?" là `INSERT`, không phải phát hành app.

**`reviews` cố tình không giữ `post_id`.** Review hiện công khai trên trang quán kèm tên người viết. Giữ `post_id` là nối một thứ công khai với một thứ có thể `PRIVATE`, mà §13 nói `PRIVATE` là *"chỉ chủ sở hữu"*. Quyền viết review kiểm bằng bảng `been` đã có sẵn.

### 7.5 `spot_tag_fit` — độ hợp, tách khỏi số phiếu

Bảng này thuộc module `spot`, không thuộc `review` — nó là thuộc tính của một địa điểm, và `review` chỉ là một trong nhiều nguồn góp phiếu. Nó nằm ở migration giai đoạn 2 vì trước khi có thẻ thì nó chưa có nghĩa gì.

`features/nooka/spots.ts:78` giải thích vì sao hai thứ này khác nhau:

> *"'Muối 43 đúng là chỗ ăn khuya' không giống '7 người đã nói nó mở muộn'"*

```sql
create table spot_tag_fit (
    spot_id    uuid not null references spots on delete cascade,
    tag_id     uuid not null references tags  on delete cascade,
    -- 1..4, do người chấm tay. NULL = chưa ai chấm, dùng giá trị suy ra từ
    -- tỉ lệ phiếu. Xếp hạng đọc coalesce(manual_fit, derived).
    manual_fit smallint check (manual_fit between 1 and 4),
    set_by     uuid references users on delete set null,
    set_at     timestamptz,
    note       text,
    primary key (spot_id, tag_id)
);
```

Suy ra là mặc định, chấm tay là ngoại lệ. Khớp §11: đội seed đi thật và biết quán nào *đúng là* chỗ ăn khuya, nhưng không ai chấm tay nổi 500 quán × 10 thẻ.

`ranking.ts` đã ghi *"Thiếu tag nào thì coi là 1"* — giữ nguyên luật đó.

---

## 8. Giai đoạn 3 — `V5__discovery.sql`

Mở khoá: Hỏi Nooka chạy trên dữ liệu thật, chia sẻ bản đồ, và đo được north-star.

§6.3 cho sẵn ba tầng:

```
AI query                  → Selection      (tạm thời, riêng một user)
User lưu / chia sẻ        → Saved / Shared Selection
Nhiều người cùng nhu cầu  → có thể nâng thành Topic
```

### 8.1 `selections`

```sql
create table selections (
    id              uuid primary key default gen_random_uuid(),
    owner_id        uuid not null references users on delete cascade,
    -- Câu hỏi gốc. KHÔNG được chứa nội dung PRIVATE — xem R7.
    query_text      text,
    intent_slug     text,
    matched_tag_ids uuid[] not null default '{}',
    saved_at        timestamptz,   -- NULL = còn tạm
    expires_at      timestamptz,   -- job dọn selection tạm đã hết hạn
    created_at      timestamptz not null default now()
);

create index selections_owner_saved_idx on selections (owner_id, created_at desc)
    where saved_at is not null;

create table selection_items (
    selection_id   uuid not null references selections on delete cascade,
    spot_id        uuid not null references spots on delete cascade,
    rank           int  not null,
    score          numeric(8, 4),
    -- Thẻ nào khiến quán này lọt vào — để giải thích, đúng ranh giới §14.
    reason_tag_ids uuid[] not null default '{}',
    primary key (selection_id, spot_id),
    unique (selection_id, rank)
);
```

`matched_tag_ids` và `reason_tag_ids` là mảng chứ không phải bảng nối, vì chúng là **ảnh chụp của một kết quả truy vấn**, không phải quan hệ giữa hai thực thể. Chúng không bao giờ được join ngược.

`expires_at` ép §6.3: *"Mỗi lần user hỏi AI **không** tạo ra một Topic public. Nếu không, hệ thống sẽ có hàng nghìn topic gần trùng nhau."* Selection tạm phải tự chết.

### 8.2 Cột thiếu khiến north-star không đo được

§15 chốt:

> *"Tỷ lệ discovery session dẫn đến **một trải nghiệm được xác nhận** — tức có bài đăng follow-up tại place đó."*

`posts.inspired_by_post_id` chỉ nối bài với bài. Không có gì nối một lượt hỏi với bài viết sau đó.

```sql
alter table posts add column from_selection_id uuid references selections on delete set null;

create index posts_from_selection_idx on posts (from_selection_id)
    where from_selection_id is not null;
```

Một cột, cùng khuôn với `inspired_by_post_id` đã có. Thiếu nó thì chỉ số quan trọng nhất của sản phẩm chỉ là ước lượng.

### 8.3 `topics`

```sql
create table topics (
    id           uuid primary key default gen_random_uuid(),
    slug         text not null unique,
    -- Bản đầu chỉ hệ thống hoặc biên tập tạo (§6.3). NULL = hệ thống.
    created_by   uuid references users on delete set null,
    area_id      uuid references areas on delete set null,
    published_at timestamptz,
    archived_at  timestamptz,
    created_at   timestamptz not null default now()
);

create table topic_translations (
    topic_id uuid       not null references topics on delete cascade,
    locale   varchar(5) not null,
    title    text       not null,
    subtitle text,
    primary key (topic_id, locale)
);

create table topic_spots (
    topic_id   uuid not null references topics on delete cascade,
    spot_id    uuid not null references spots on delete cascade,
    sort_order int  not null default 0,
    added_by   uuid references users on delete set null,
    added_at   timestamptz not null default now(),
    primary key (topic_id, spot_id)
);
```

§10 liệt "User tự tạo và quản lý Topic" là ngoài phạm vi bản đầu. Schema hỗ trợ được (`created_by` khác NULL), nhưng API bản đầu không mở đường đó.

### 8.4 `shared_links`

```sql
create table shared_links (
    id           uuid primary key default gen_random_uuid(),
    token        text not null unique,     -- phần xuất hiện trong URL
    owner_id     uuid not null references users on delete cascade,
    kind         text not null check (kind in ('PROFILE_MAP', 'SELECTION')),
    selection_id uuid references selections on delete cascade,
    visibility   text not null check (visibility in ('PUBLIC', 'FOLLOWERS', 'PRIVATE')),
    revoked_at   timestamptz,
    created_at   timestamptz not null default now(),
    check ((kind = 'SELECTION') = (selection_id is not null))
);
```

Ba mức khớp đúng `app/share-map.tsx`: `public` / `friends` / `private`.

Luật quan trọng nhất của bảng này là §13: *"Share link không được bypass visibility."* Mở một link chia sẻ vẫn lọc bài viết qua `PostAccess` bằng danh tính **người đang xem**, không phải của người chia sẻ. Chủ bản đồ thấy 34 quán; người lạ mở link có thể chỉ thấy 12. Xem R4.

`revoked_at` cho phép thu hồi link đã phát.

---

## 9. Giai đoạn 4 — `V6__business.sql`

§10 liệt "Business actor" là ngoài phạm vi bản đầu; §12 đặt nó ở giai đoạn 1 của lộ trình, tháng 6–12.

```sql
create table spot_claims (
    id            uuid primary key default gen_random_uuid(),
    spot_id       uuid not null references spots on delete cascade,
    claimant_id   uuid not null references users on delete cascade,
    -- Bằng chứng: ảnh giấy phép, email theo tên miền quán, số trên bảng hiệu...
    -- Hình dạng sẽ đổi nhiều lần, nên jsonb thay vì cột cứng.
    evidence      jsonb not null default '{}',
    status        text not null default 'PENDING'
        check (status in ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN')),
    reviewed_by   uuid references users on delete set null,
    reviewed_at   timestamptz,
    reject_reason text,
    created_at    timestamptz not null default now()
);

-- Một quán chỉ có đúng một hồ sơ đang chờ tại một thời điểm.
create unique index spot_claims_one_pending_idx on spot_claims (spot_id)
    where status = 'PENDING';

create table spot_managers (
    spot_id    uuid not null references spots on delete cascade,
    user_id    uuid not null references users on delete cascade,
    role       text not null default 'OWNER' check (role in ('OWNER', 'STAFF')),
    granted_by uuid references users on delete set null,
    granted_at timestamptz not null default now(),
    revoked_at timestamptz,
    primary key (spot_id, user_id)
);
```

Partial unique index chỉ ép duy nhất trên các dòng `PENDING`: một quán có thể có nhiều hồ sơ đã bị từ chối trong lịch sử, nhưng không bao giờ có hai hồ sơ chờ cùng lúc.

### Ranh giới quyền của chủ quán

Chủ quán sau khi được duyệt **được** sửa: `spots.name`, `places.address`, `places.latitude`/`longitude`, `spot_hours`.

Chủ quán **không được**: xoá bài viết, xoá review, sửa thẻ, ẩn nội dung tiêu cực.

§1 chốt Nooka *"không phải nền tảng review doanh nghiệp"*. Cho chủ quán động vào nội dung là biến nó thành đúng thứ đó, và giết moat số 2 ở §12 vì metadata chỉ đáng tin khi chủ quán không sửa được.

Đây là luật cấp service, không phải constraint — xem R5.

---

## 10. Giai đoạn 5 — `V7__messaging.sql`

§10 liệt "Inbox đầy đủ và message request" là ngoài phạm vi bản đầu, kèm: *"Chat 1-1 chỉ làm khi có bằng chứng người ta thật sự cần."*

Frontend đã dựng xong `app/(tabs)/messages.tsx` và `app/chat/[id].tsx` — prototype đi trước phạm vi. Giai đoạn này đứng cuối là chủ ý.

```sql
create table conversations (
    id             uuid primary key default gen_random_uuid(),
    kind           text not null default 'DIRECT' check (kind in ('DIRECT', 'GROUP')),
    -- Quán ghim ở đầu luồng chat (banner trong chat/[id].tsx).
    pinned_spot_id uuid references spots on delete set null,
    created_by     uuid not null references users on delete cascade,
    created_at     timestamptz not null default now()
);

create table conversation_members (
    conversation_id uuid not null references conversations on delete cascade,
    user_id         uuid not null references users on delete cascade,
    nickname        text,          -- tên tôi đặt cho người kia
    wallpaper       text,          -- ảnh nền tôi chọn
    muted_until     timestamptz,
    last_read_at    timestamptz,   -- thay cho cả một bảng "đã xem"
    accepted_at     timestamptz,   -- NULL = còn nằm ở mục "Requests"
    joined_at       timestamptz not null default now(),
    left_at         timestamptz,
    primary key (conversation_id, user_id)
);

create index conversation_members_user_idx on conversation_members (user_id)
    where left_at is null;

create table messages (
    id              uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references conversations on delete cascade,
    sender_id       uuid not null references users on delete cascade,
    kind            text not null default 'TEXT'
        check (kind in ('TEXT', 'SPOT', 'POST', 'INVITE')),
    body            text,
    spot_id         uuid references spots on delete set null,
    post_id         uuid references posts on delete set null,
    created_at      timestamptz not null default now(),
    deleted_at      timestamptz,
    check (kind <> 'TEXT' or body    is not null),
    check (kind <> 'SPOT' or spot_id is not null),
    check (kind <> 'POST' or post_id is not null)
);

create index messages_conversation_created_idx on messages (conversation_id, created_at desc)
    where deleted_at is null;

create table message_invites (
    message_id   uuid primary key references messages on delete cascade,
    spot_id      uuid not null references spots on delete restrict,
    proposed_at  timestamptz,
    status       text not null default 'PENDING'
        check (status in ('PENDING', 'ACCEPTED', 'DECLINED')),
    responded_at timestamptz
);
```

**Ba cột đặt đúng chỗ, và chỗ đặt là điểm dễ sai nhất phần này.**

`nickname`, `wallpaper`, `muted_until` nằm ở bảng thành viên chứ không ở `conversations`, vì chúng là *của tôi về cuộc trò chuyện này*, không phải *của cuộc trò chuyện*. Đặt nhầm lên `conversations` thì hai người dùng chung một biệt danh.

`last_read_at` thay cho bảng "đã xem" riêng — bảng đó sẽ lớn bằng bảng tin nhắn. `chat.seenStatus` "Seen 14:02" = `last_read_at` của người kia; số tin chưa đọc = đếm tin sau mốc đó.

`accepted_at` giải quyết mục "Requests" mà không cần bảng nào. §3 đã bỏ friend request, nhưng tab Messages vẫn có Requests — và đó là chuyện khác: người tôi không follow nhắn tôi. Người lạ nhắn thì dòng thành viên của tôi có `accepted_at` rỗng; tôi trả lời thì điền vào.

`kind` tồn tại để ba bộ lọc ở tab Messages (`all`/`invites`/`posts`) thành một điều kiện có index.

**Không có cột `last_message_at`** — xem §11.1.

---

## 11. Truy vấn chủ chốt

### 11.1 Feed

Câu khó nhất hệ thống: *"bài của những người tôi follow, mà tôi được phép xem, mới nhất trước."*

Cách viết ngây thơ (`where exists (select 1 from follows ...) order by created_at desc`) bắt Postgres tìm bài của rất nhiều tác giả rồi sắp theo thời gian; kế hoạch xấu dần theo số người follow.

Cách đúng là **gộp top-k**, tận dụng `posts_author_created_idx` đã có ở V1:

```sql
select p.* from (
    select followee_id as author_id from follows where follower_id = :me
    union all select :me
) a
cross join lateral (
    select * from posts p
    where p.author_id = a.author_id and p.deleted_at is null
      and (p.created_at, p.id) < (:cursorAt, :cursorId)
    order by p.created_at desc, p.id desc
    limit 20
) p
order by p.created_at desc, p.id desc limit 20;
```

Điều kiện visibility ghép thêm qua `PostAccess`; câu trên chỉ mô tả hình dạng.

**Đã loại fan-out on write (bảng `feed_entries`), và lý do không phải hiệu năng.** §13 chốt *"Đổi visibility có hiệu lực ngay."* Fan-out tính quyền xem tại thời điểm **ghi**; sau đó block, unfollow hoặc đổi visibility làm hàng nghìn dòng đã phát đi thành sai. Muốn đúng thì vẫn phải kiểm lại quyền lúc đọc — làm cả hai việc mà chỉ được lợi ích của một. Fan-out cũng là quyết định không rút lui được rẻ.

Thêm nữa §3 nói *"Không lấy số follower làm tín hiệu nổi bật"* và §11 khoá phạm vi 2–3 quận: sản phẩm chủ động không tạo ra hoàn cảnh khiến cách pull gãy.

**Bắt buộc dùng keyset, không dùng `OFFSET`.** `OFFSET 2000` bắt Postgres đọc rồi bỏ 2000 dòng, và bài mới chèn vào giữa làm lệch trang.

**Va chạm với §13:** con trỏ phân trang chứa `created_at`. Bài có `hide_time` đã ẩn thời gian trên giao diện nhưng con trỏ vẫn kể ra. Con trỏ phải được **server ký HMAC và client không giải mã được**; nếu chỉ base64 thì `hide_time` chỉ là trang trí.

Cùng cách gộp top-k áp dụng cho danh sách hội thoại, nên `conversations` không cần cột `last_message_at`:

```sql
select c.id, m.body, m.created_at
from conversations c
join conversation_members cm on cm.conversation_id = c.id
                            and cm.user_id = :me and cm.left_at is null
cross join lateral (
    select body, created_at from messages
    where conversation_id = c.id and deleted_at is null
    order by created_at desc limit 1
) m
order by m.created_at desc;
```

Nếu có ngày nó chậm, `last_message_at` là thứ đầu tiên nên thêm — thêm khi đo được, không phải thêm phòng xa.

### 11.2 Xếp hạng

`rankSpots()` hiện sắp toàn bộ danh sách quán. Với 4 quán thì được; với 50 nghìn thì không.

Xếp hạng server phải hai tầng:

```
Tầng 1 — sinh ứng viên   lọc theo khu vực + bán kính + có ít nhất một thẻ khớp
                          → còn 50–200 quán, có index đỡ
Tầng 2 — chấm điểm       chỉ chấm số ứng viên đó
```

Công thức lấy nguyên từ `features/nooka/ranking.ts:47`, không phát minh lại:

```
score = Σ (fit[thẻ] ?? 1) × 2 + số_phiếu[thẻ] / 12  +  min(checkins, 120) / 400
```

Tầng 2 cần số phiếu theo thẻ cho từng ứng viên. Theo cách A, con số đó tính lúc đọc — mỗi lượt hỏi chạy một phép gộp cho 200 quán.

**Đây là nơi cách A hết chịu nổi đầu tiên**, sớm hơn hẳn trang cá nhân hay trang quán. Khi cần nâng cấp lên cách C, `spot_tag_stats` là bảng đầu tiên phải dựng, không phải `spot_stats`.

### 11.3 Đếm thẻ — và lỗi đếm chỉ lộ ra khi viết thành SQL

Tôi đăng bài ở Workshop, gắn thẻ `quiet`. Rồi tôi viết review, trả lời "không bị nhắc" → sinh thẻ `workFriendly`. Nếu cả hai đều là một phiếu thì **một người bỏ được hai phiếu cho cùng một thẻ ở cùng một quán**.

Giao diện ghi "34" cạnh thẻ, và người đọc hiểu là **34 người**, không phải 34 phiếu.

```sql
select t.id, t.slug, count(distinct src.user_id) as people
from tags t
join lateral (
        select p.author_id as user_id
        from post_vibe_tags pvt
        join posts p on p.id = pvt.post_id
        where pvt.tag_id = t.id and p.spot_id = :spotId
          and p.deleted_at is null
          and p.visibility in ('PUBLIC', 'FOLLOWERS')      -- R3b
    union                                                   -- union, KHÔNG union all
        select rv.author_id
        from review_answers ra
        join reviews rv on rv.id = ra.review_id
        join review_question_options o on o.id = ra.option_id
        where o.grants_tag_id = t.id and rv.spot_id = :spotId
          and rv.deleted_at is null
) src on true
where t.archived_at is null
group by t.id, t.slug
order by people desc;
```

`union` thay vì `union all` là toàn bộ chỗ sửa — nó gộp trùng theo `user_id`.

---

## 12. Vấn đề vận hành

### 12.1 Ảnh và EXIF

R1 khoá: **strip ở server, client không bao giờ được coi là đã sạch.** Luật đó loại kiến trúc phổ biến "client xin presigned URL rồi tải thẳng lên S3", vì ảnh còn nguyên EXIF đã nằm trong kho trước khi server kịp chạm vào.

| | Cách | Đánh đổi |
|---|---|---|
| 1 | Qua server: client POST byte → server gỡ EXIF → đẩy lên kho | Đơn giản, R1 đúng theo định nghĩa. Ảnh lớn chiếm luồng xử lý |
| 2 | Khu cách ly: client tải lên bucket riêng tư → worker gỡ EXIF, ghi sang bucket công khai, xoá bản gốc | Mở rộng tốt. Ảnh xử lý bất đồng bộ nên bài có thể tồn tại lúc ảnh chưa sẵn sàng, mà §10 bắt buộc ≥ 1 ảnh |

**Chốt cách 1**, nhưng cột trạng thái ở §6.6 đặt sẵn từ migration đầu. Cách 1 luôn ghi `READY`. Ngày chuyển sang cách 2, đổi luồng xử lý chứ không đổi schema, và không phải migrate một bảng ảnh đã có hàng triệu dòng.

Tách `storage_key` khỏi `url` cũng quan trọng: đổi CDN hay đổi nhà cung cấp kho thì `url` đổi hết, `storage_key` không đổi.

### 12.2 Xoá tài khoản — hai bước

`users.deleted_at` và `users.anonymized_at` ở §6.2 phục vụ việc này.

**Bước 1 (ngay):** đặt `deleted_at`, ẩn khỏi mọi bề mặt, thu hồi mọi session.

**Bước 2 (sau thời gian ân hạn):** đặt `anonymized_at`, xoá email, `display_name`, `avatar_url`, `bio`; thay bằng nhãn "Người dùng đã xoá". Giữ lại cấu trúc để bình luận trên bài người khác không để lại lỗ hổng.

Ân hạn cũng xử lý một tình huống rất thật: xoá tài khoản trong lúc giận rồi hôm sau muốn quay lại.

`reports.reporter_id` đã đổi sang `on delete set null` ở §6.8 nên báo cáo sống sót qua cả hai bước.

**Một hệ quả bắt buộc lên `PostAccess`.** Thêm `users.deleted_at` tạo ra một trạng thái chưa từng tồn tại: bài viết còn nguyên, tác giả đã ẩn. `PostVisibilityRules.visibleTo()` hiện chỉ kiểm `posts.deleted_at`, nên nếu không sửa thì bài của tài khoản đã xoá vẫn nằm trong feed người khác — đúng thứ bước 1 định chặn.

`visibleTo()` phải thêm một vế: tác giả không được có `deleted_at`. Việc này đi cùng giai đoạn 1, cùng migration thêm cột, và phải có test cho cả hai chiều. Đây là một thay đổi luật visibility, nên theo `nooka-api/AGENTS.md` thì test viết trước.

### 12.3 Hai chỗ đua ghi

**Hai người tạo cùng một quán cùng lúc.** Cả hai chạy kiểm tra chống trùng, cả hai thấy sạch, cả hai chèn.

Có thể chặn bằng `unique (area_id, lower(name))`, nhưng như thế thì hai quán thật sự trùng tên trong một quận (chuỗi có hai chi nhánh) không tạo được — sai kiểu khó chịu hơn.

**Chấp nhận cuộc đua**, để job nền phát hiện rồi đẩy vào `spot_merge_candidates`.

**Hai bài đăng cùng lúc cùng một quán bật `been`.** Khoá chính `(user_id, spot_id)` lo được:

```sql
insert into been (user_id, spot_id, first_post_id) values (:user, :spot, :post)
on conflict (user_id, spot_id) do nothing;
```

`do nothing` giữ đúng ngữ nghĩa `first_post_id` — bài **đầu tiên**, không phải bài gần nhất.

### 12.4 Gộp spot — bước bắt buộc dễ quên

Khi gộp, `spots.merged_into_id` (đã có ở V1) trỏ bản thua sang bản thắng và bài viết cũ giữ nguyên.

Nhưng `want_to_go` và `been` có khoá chính `(user_id, spot_id)`, nên một user có thể đang giữ **cả hai** bản. Job gộp phải nhập hai dòng thành một, giữ `created_at` sớm hơn và `first_post_id` của dòng sớm hơn. Xem R8.

Mọi đường đọc spot phải theo con trỏ `merged_into_id` thay vì trả về bản thua.

---

## 13. Invariant

Hai cái đầu đã có; tám cái sau là mới.

| | Luật | Vì sao dễ vỡ |
|---|---|---|
| **R1** | EXIF strip ở server | có sẵn |
| **R2** | Mọi đường đọc Post qua `PostAccess` | có sẵn |
| **R3a** | Số liệu **phụ thuộc người xem** (`friendCount`) phải đếm qua `PostAccess` | `count(*) from posts` viết ra rất tự nhiên, và nó rò `PRIVATE` — xem dưới |
| **R3b** | Số liệu **toàn cục** đếm theo tầng cố định `PUBLIC` + `FOLLOWERS`; không bao giờ đếm `CLOSE_FRIENDS` hay `PRIVATE` | Nếu phụ thuộc người xem thì mỗi người một con số và không bao giờ cache được |
| **R4** | Link chia sẻ render theo danh tính **người xem** | Cách viết tự nhiên là render theo góc nhìn chủ link, và cách đó rò toàn bộ |
| **R5** | Chủ quán không sửa/xoá được nội dung do user tạo | Sẽ bị áp lực thương mại xói mòn ở §12 giai đoạn 2 |
| **R6** | Không cột nào lưu Content của Google | Một dòng code "tiện tay" là vi phạm ToS |
| **R7** | `selections.query_text` không chứa nội dung `PRIVATE` | AI context là đường rò dễ quên nhất |
| **R8** | Gộp spot phải gộp cả `want_to_go` và `been` trùng | Khoá chính `(user_id, spot_id)` cho phép giữ cả hai bản |
| **R9** | Bài của tài khoản đã `deleted_at` không hiện với bất kỳ ai | `visibleTo()` hiện chỉ kiểm `posts.deleted_at` — xem §12.2 |

**Cách ép từng luật khác nhau, và cần nói rõ để không ai tưởng có test là xong:**

| Ép bằng | Luật |
|---|---|
| Constraint của database | R8 một phần (`check` trên cặp merge), các check ở §14.1 |
| Test tự động | R3a, R3b, R4, R5, R8, R9 |
| ArchUnit | R2 (cửa `PostAccess`), luật đọc một chiều |
| Chỉ có code review | **R1, R6, R7** |

Ba luật cuối không có cách kiểm tự động: không test nào chứng minh được một byte EXIF đã bị gỡ đúng cách, rằng không ai vừa thêm một cột chứa dữ liệu Google, hay rằng chuỗi gửi cho AI không chứa nội dung `PRIVATE`. Chúng phải nằm trong checklist review, và `check (source in ('USER_CREATED', 'SEEDED'))` là thứ duy nhất chặn R6 ở tầng máy.

### Lỗ rò mà R3a chặn

§8 chốt `Been` **tự động bật** khi user đăng bài tại quán — kể cả bài `PRIVATE`. Frontend hiện `spot.friends: 6` = *"mấy bạn của tôi đã tới đây"*. Nếu con số đó đếm thẳng bảng `been`:

> Tôi đăng một bài `PRIVATE` ở quán X → `been` bật → bạn tôi mở trang quán X thấy `friends` tăng từ 5 lên 6 → **họ biết tôi vừa tới đó**.

Bài thì họ không đọc được, nhưng con số đã kể xong câu chuyện. §13 gọi đúng tên vấn đề: *"ảnh + địa điểm + thời gian đăng vẫn tiết lộ user đang ở đâu"* — ở đây còn không cần ảnh.

Bảng `been` chỉ dùng cho giao diện của chính chủ. Mọi con số tổng hợp trên nó phải đếm qua `PostAccess`.

### Vì sao R3b đếm cả `FOLLOWERS`

Có hai loại con số, rò rỉ theo hai kiểu:

| Loại | Ví dụ | Rò kiểu gì |
|---|---|---|
| Phụ thuộc người xem | `friendCount` | Chỉ đích danh. Tăng từ 5 lên 6 là biết được **ai** |
| Toàn cục, ẩn danh | `checkinCount`, số phiếu thẻ | Không chỉ ai. 118 hay 119 chẳng nói lên người nào |

`PRIVATE` và `CLOSE_FRIENDS` chắc chắn không đếm — §13 xếp hai tầng này là giữ kín.

`FOLLOWERS` **có đếm**: chọn `FOLLOWERS` là để giới hạn ai xem ảnh của mình, không phải để lượt ghé biến mất khỏi thống kê của quán. Không đếm thì một quán mà ai cũng đăng `FOLLOWERS` hiện "0 check-in" — sai sự thật và giao diện thành vô nghĩa.

**Điều kiện đi kèm:** màn chọn visibility phải nói rõ rằng bài ở mức `FOLLOWERS` vẫn được tính vào thống kê công khai của địa điểm.

R3a và R3b là hai cái đáng lo nhất trong danh sách, cùng với R4 — cả ba đều **rò dữ liệu mà không báo lỗi**.

---

## 14. Kiểm thử

### 14.1 Test constraint — chứng minh database *từ chối* dữ liệu sai

Chạy với Testcontainers PostgreSQL thật, đúng luật `nooka-api/AGENTS.md`:

- Chèn cặp merge ngược thứ tự → vi phạm `check (lower_spot_id < higher_spot_id)`
- Chèn hồ sơ claim `PENDING` thứ hai cho cùng quán → vi phạm `spot_claims_one_pending_idx`
- Chèn review thứ hai của cùng người cho cùng quán → vi phạm `reviews_author_spot_key`
- Chèn `messages` với `kind='SPOT'` mà `spot_id` rỗng → vi phạm check
- Chèn `shared_links` với `kind='SELECTION'` mà `selection_id` rỗng → vi phạm check
- Chèn `spot_hours` với `day_of_week = 7` → vi phạm check

Loại test này hay bị bỏ vì "code có bao giờ ghi sai đâu". Nhưng constraint tồn tại chính là để chặn code sai trong tương lai, nên phải có bằng chứng nó đang bật.

### 14.2 Test visibility — đủ cả hai chiều

`nooka-api/AGENTS.md` đã yêu cầu *"cả case cho phép và từ chối, đặc biệt follow direction, close-friend ownership, block hai chiều và soft-delete"*. Mở rộng:

- **R3a:** đăng `PRIVATE` tại quán X → `SpotStats.friendCount` mà bạn tôi thấy **không** tăng
- **R3b:** đăng `CLOSE_FRIENDS` tại quán X → `checkinCount` toàn cục **không** tăng; đăng `FOLLOWERS` → **có** tăng
- **R4:** mở `shared_links` bằng tài khoản không follow chủ → chỉ thấy phần `PUBLIC`; mở cùng link lúc chưa đăng nhập → cũng chỉ `PUBLIC`
- **R5:** tài khoản trong `spot_managers` gọi API xoá bài → bị từ chối
- **R9:** đặt `users.deleted_at` cho tác giả → bài của họ biến mất khỏi feed người khác, khỏi trang quán, và khỏi mọi con số của `insight`; bỏ `deleted_at` ra → hiện lại
- **Đếm thẻ:** một user vừa gắn thẻ trên bài vừa trả lời review sinh cùng thẻ đó → `people` tăng đúng **1**

### 14.3 ArchUnit

- Module mới theo luật đọc một chiều ở §5.2
- `insight` không được chạm `PostRepository`
- Không có `@ManyToOne`/`@OneToMany` chéo module

### 14.4 Migration

`ddl-auto=validate` đã bật, nên mỗi migration tự động được đối chiếu với entity khi khởi động test context. Mỗi giai đoạn phải chạy được test context trước khi coi là xong.

---

## 15. Tài liệu phải cập nhật

Không sửa là để lại luật sai, mà `nooka-mobile/AGENTS.md` nói đúng: *"Luật sai còn tệ hơn không có luật — nó dạy người đọc rằng file này không đáng tin."*

| File | Sửa gì |
|---|---|
| `nooka-api/AGENTS.md` | Thêm 6 module mới vào phần kiến trúc; thêm R3a–R8 vào phần luật truy cập; ghi quyết định UUIDv7 và cảnh báo `Style.TIME` |
| `nooka-mobile/AGENTS.md` | Nhãn và từ đồng nghĩa của thẻ chuyển sang API; bỏ ghim Google khỏi bản đồ; bỏ chấm xanh "đang ở quán" nhưng giữ chấm "đang online"; bỏ nút `Add → Requested` |
| `nooka-docs/product/specs/2026-07-27-nooka-design.md` | §7 ghi nhận frontend đang gọi Google Places và phải gỡ; §10 bỏ "Chỉ đường" khỏi danh sách ngoài phạm vi vì module `directions` đã chạy theo quyết định ngày 2026-08-06 |
| `nooka-api/MEMORY.md` | Ghi 5 giai đoạn migration, quyết định PostGIS và quyết định UUIDv7 |
| `nooka-api/README.md` | Ghi yêu cầu image `postgis/postgis:17-3.5-alpine` |

---

## 16. Thứ tự triển khai

| | Migration | Mở khoá được gì | §10 |
|---|---|---|---|
| 1 | `V3__foundation.sql` | Tạo quán có chống trùng, sửa hồ sơ, giờ mở cửa, vá lỗ `reports`, ID công khai | trong phạm vi |
| 2 | `V4__tags_and_reviews.sql` | **Khép vòng lặp cốt lõi.** Review → thẻ → xếp hạng | trong phạm vi |
| 3 | `V5__discovery.sql` | Hỏi Nooka trên dữ liệu thật, chia sẻ bản đồ, **đo được north-star** | trong phạm vi |
| 4 | `V6__business.sql` | §12 giai đoạn 1 — 200 quán claim, tháng 6–12 | ngoài phạm vi bản đầu |
| 5 | `V7__messaging.sql` | Tab Messages chạy thật | ngoài phạm vi bản đầu |

Giai đoạn 2 đặt trước giai đoạn 3 vì §10 nói vòng lặp phải chứng minh được trước mọi thứ khác, và xếp hạng không có thẻ thật thì chỉ là xếp hạng dữ liệu giả.

Mỗi migration chạy độc lập, không cái nào cần cái sau nó. Dừng ở bất kỳ giai đoạn nào cũng có một hệ thống hoàn chỉnh.

Việc đổi `BaseEntity` sang `@UuidGenerator(style = VERSION_7)` đi cùng giai đoạn 1, vì nó không cần migrate dữ liệu và càng làm sớm thì càng nhiều dòng được hưởng.

---

## 17. Ngoài phạm vi tài liệu này

- **Booking và thanh toán cho Experience.** §12 đặt ở giai đoạn 3 của lộ trình, 18 tháng trở đi. `experiences` đã có `price_amount`/`price_currency` từ V1 đúng như §7 yêu cầu, nên thêm booking sau này chỉ động vào module `spot` và một module mới, không đụng `post`.
- **Bảng projection của cách C.** Chỉ dựng khi đo được chậm; §11.2 chỉ ra `spot_tag_stats` là bảng đầu tiên.
- **Tách `messages` sang kho riêng.** Chỉ cân nhắc khi có số đo thật.
- **Google Places autocomplete.** §7 cho phép thêm sau như tiện ích tìm kiếm. Nếu thêm, giới hạn tối đa được lưu là một cột `places.google_place_id`.
- **Full-text search cho universal search.** §6.1 mô tả bốn tab kết quả; `pg_trgm` đã bật ở giai đoạn 1 đủ cho tìm theo tên, nhưng tìm trong nội dung bài viết cần `tsvector` và một thiết kế riêng.
