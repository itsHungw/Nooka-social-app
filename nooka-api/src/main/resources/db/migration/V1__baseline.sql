-- Baseline schema cho vertical slice ở §10 của spec.
--
-- Vòng lặp phải chứng minh được:
--   A đăng một place kèm ảnh → B thấy → B bấm Want to go → B đến → B đăng
--   → hai bài được nối với nhau → A biết gợi ý của mình tạo ra một chuyến đi.

create extension if not exists pgcrypto;


-- ---------------------------------------------------------------------------
-- Địa lý: City → Area → Spot (§7)
--
-- Area tồn tại từ đầu vì §11 khóa việc mở rộng theo mật độ: một user mới phải
-- thấy ít nhất 20 place thật trong bán kính quen thuộc. Không có Area thì
-- không đo được mật độ để quyết định khi nào mở quận tiếp theo.
-- ---------------------------------------------------------------------------

create table cities (
    id           uuid primary key default gen_random_uuid(),
    name         text        not null,
    -- varchar chứ không phải char: char(n) đệm khoảng trắng cho đủ độ dài, nên
    -- 'VN' lưu vào char(3) thành 'VN ' và mọi phép so sánh sau đó thành bẫy.
    country_code varchar(2)  not null,
    created_at   timestamptz not null default now()
);

create table areas (
    id         uuid primary key default gen_random_uuid(),
    city_id    uuid        not null references cities on delete restrict,
    name       text        not null,
    created_at timestamptz not null default now(),
    unique (city_id, name)
);


-- ---------------------------------------------------------------------------
-- User
--
-- Firebase Auth phát hành token, backend chỉ verify (§20). Vì vậy bảng này
-- không có cột mật khẩu và sẽ không bao giờ có.
-- ---------------------------------------------------------------------------

create table users (
    id           uuid primary key default gen_random_uuid(),
    firebase_uid text        not null unique,
    username     text        not null,
    display_name text        not null,
    avatar_url   text,

    -- §13: mặc định KHÔNG phải Public với tài khoản mới.
    default_post_visibility text not null default 'FOLLOWERS'
        check (default_post_visibility in ('PUBLIC', 'FOLLOWERS', 'CLOSE_FRIENDS', 'PRIVATE')),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Username phân biệt hoa thường khi hiển thị nhưng không được trùng khi bỏ qua
-- hoa thường — nếu không thì "Minh" và "minh" là hai người khác nhau.
create unique index users_username_lower_key on users (lower(username));


-- ---------------------------------------------------------------------------
-- Quan hệ xã hội (§3)
--
-- Follow một chiều. Follow hai chiều được đối xử như bạn bè, nhưng không lưu
-- thành bảng riêng — nó suy ra được, và lưu thừa thì sẽ có ngày lệch.
-- ---------------------------------------------------------------------------

create table follows (
    follower_id uuid        not null references users on delete cascade,
    followee_id uuid        not null references users on delete cascade,
    created_at  timestamptz not null default now(),
    primary key (follower_id, followee_id),
    check (follower_id <> followee_id)
);

-- Feed lọc theo "những người tôi follow", nên cần chiều follower → followee.
-- Chiều ngược lại phục vụ việc kiểm tra follow hai chiều và đếm follower.
create index follows_followee_idx on follows (followee_id);

-- §3: danh sách một chiều, riêng tư, KHÔNG thông báo cho người được thêm.
-- Vì vậy không có cột trạng thái và không có gì để người kia chấp nhận.
create table close_friends (
    owner_id   uuid        not null references users on delete cascade,
    friend_id  uuid        not null references users on delete cascade,
    created_at timestamptz not null default now(),
    primary key (owner_id, friend_id),
    check (owner_id <> friend_id)
);

-- §3: chặn mọi tương tác hai chiều. Lưu một chiều, truy vấn kiểm tra cả hai.
create table blocks (
    blocker_id uuid        not null references users on delete cascade,
    blocked_id uuid        not null references users on delete cascade,
    created_at timestamptz not null default now(),
    primary key (blocker_id, blocked_id),
    check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on blocks (blocked_id);


-- ---------------------------------------------------------------------------
-- Spot: Place và Experience (§7)
--
-- Spec khóa hai điều mâu thuẫn nhau nếu làm ẩu:
--   1. Place và Experience "ngang hàng, cùng nhận Post, cùng nhận Want to go
--      và Been, cùng xuất hiện trong feed dưới một loại card"
--   2. "Nếu nhét Experience vào chung bảng Place thì khi thêm booking sẽ phải
--      migrate lại toàn bộ"
--
-- Giải bằng class-table inheritance: `spots` giữ phần chung mà Post và Want to
-- go trỏ vào, `places` và `experiences` giữ phần riêng. Thêm booking sau này
-- chỉ động vào `experiences`, không đụng tới Post.
-- ---------------------------------------------------------------------------

create table spots (
    id      uuid primary key default gen_random_uuid(),
    kind    text not null check (kind in ('PLACE', 'EXPERIENCE')),
    name    text not null,
    area_id uuid not null references areas on delete restrict,

    -- §7: place do user tạo, không lấy từ Google Places. Giữ người tạo để
    -- lần được dấu vết khi phải gộp bản trùng.
    created_by uuid        not null references users on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- §7: "cần cơ chế chống trùng place ngay từ đầu". Khi hai bản được xác
    -- nhận là một, bản thua trỏ vào bản thắng thay vì bị xoá — Post cũ vẫn
    -- còn nguyên và vẫn đọc được.
    merged_into_id uuid references spots on delete restrict,
    check (merged_into_id is null or merged_into_id <> id)
);

create index spots_area_idx on spots (area_id) where merged_into_id is null;

-- Chống trùng: so tên trong cùng khu vực. Chỉ là lưới lọc thô, việc so tọa độ
-- trong bán kính nằm ở tầng ứng dụng vì cần ngưỡng khoảng cách.
create index spots_area_name_idx on spots (area_id, lower(name));

create table places (
    spot_id   uuid primary key references spots on delete cascade,
    address   text,
    -- Toạ độ để đối chiếu trùng lặp và tính khoảng cách. Dùng numeric thay vì
    -- float: sai số dấu phẩy động ở vĩ độ là sai số vị trí thật.
    latitude  numeric(9, 6),
    longitude numeric(9, 6),
    check (latitude  is null or latitude  between  -90 and  90),
    check (longitude is null or longitude between -180 and 180)
);

create table experiences (
    spot_id        uuid primary key references spots on delete cascade,
    -- §7: Experience có giá vé. Chưa có booking ở bản đầu, nhưng cột giá phải
    -- tồn tại từ schema đầu tiên.
    price_amount   numeric(12, 2),
    price_currency varchar(3),
    starts_at      timestamptz,
    ends_at        timestamptz,
    check (price_amount is null or price_amount >= 0),
    check (ends_at is null or starts_at is null or ends_at >= starts_at)
);


-- ---------------------------------------------------------------------------
-- Post (§10, §13)
-- ---------------------------------------------------------------------------

create table posts (
    id        uuid primary key default gen_random_uuid(),
    author_id uuid not null references users on delete cascade,
    spot_id   uuid not null references spots on delete restrict,

    -- §13. Bốn mức này bị ép ở mọi truy vấn chạm tới Post — xem R2 ở §20.
    visibility text not null
        check (visibility in ('PUBLIC', 'FOLLOWERS', 'CLOSE_FRIENDS', 'PRIVATE')),

    caption           text,
    one_thing_to_know text,
    occasion          text,
    price_amount      numeric(12, 2),
    price_currency    varchar(3),
    party_size        int,
    would_return      boolean,

    -- §13: "ảnh + địa điểm + thời gian đăng vẫn tiết lộ user đang ở đâu ngay
    -- lúc này". Bản đầu chốt cho phép ẩn thời gian.
    hide_time boolean not null default false,

    -- §10: mắt xích đóng vòng lặp. B đăng bài sau khi đi theo gợi ý của A thì
    -- bài của B trỏ về bài của A, nhờ đó A biết gợi ý của mình có tác dụng.
    inspired_by_post_id uuid references posts on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- Xoá mềm: bài đã xoá phải biến mất khỏi feed nhưng follow-up link trỏ vào
    -- nó thì không được gãy.
    deleted_at timestamptz,

    check (party_size is null or party_size > 0),
    check (price_amount is null or price_amount >= 0),
    check (inspired_by_post_id is null or inspired_by_post_id <> id)
);

-- Feed đọc theo tác giả và theo thời gian giảm dần. Điều kiện một phần loại
-- luôn bài đã xoá khỏi chỉ mục.
create index posts_author_created_idx on posts (author_id, created_at desc)
    where deleted_at is null;

-- Place page đọc mọi bài tại một spot.
create index posts_spot_created_idx on posts (spot_id, created_at desc)
    where deleted_at is null;

-- Discovery chỉ chạm bài Public, nên tách riêng để không quét bài riêng tư.
create index posts_public_created_idx on posts (created_at desc)
    where deleted_at is null and visibility = 'PUBLIC';

create index posts_inspired_by_idx on posts (inspired_by_post_id)
    where inspired_by_post_id is not null;

-- §10: bắt buộc ≥ 1 ảnh khi đăng. Ràng buộc "ít nhất một" không diễn đạt được
-- bằng constraint ở đây nên nó được ép ở tầng ứng dụng lúc tạo bài.
create table post_media (
    id       uuid primary key default gen_random_uuid(),
    post_id  uuid not null references posts on delete cascade,
    -- Ảnh đã bị strip EXIF ở server trước khi lưu (R1 ở §20). URL này trỏ tới
    -- bản đã xử lý; bản gốc từ client không bao giờ được lưu.
    url      text not null,
    width    int,
    height   int,
    position int  not null default 0,
    unique (post_id, position)
);

create table post_vibe_tags (
    post_id uuid not null references posts on delete cascade,
    tag     text not null,
    primary key (post_id, tag)
);


-- ---------------------------------------------------------------------------
-- Tương tác (§7)
--
-- Bảng nào gắn vào đâu đã được spec khóa cứng:
--   React, Comment  → Post
--   Want to go, Been → Spot
-- "User thích một bài đăng, nhưng thứ họ muốn đi và lưu là một địa điểm."
-- ---------------------------------------------------------------------------

create table reactions (
    post_id    uuid        not null references posts on delete cascade,
    user_id    uuid        not null references users on delete cascade,
    created_at timestamptz not null default now(),
    primary key (post_id, user_id)
);

create table comments (
    id         uuid primary key default gen_random_uuid(),
    post_id    uuid        not null references posts on delete cascade,
    author_id  uuid        not null references users on delete cascade,
    body       text        not null,
    created_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index comments_post_created_idx on comments (post_id, created_at)
    where deleted_at is null;

create table want_to_go (
    user_id    uuid        not null references users on delete cascade,
    spot_id    uuid        not null references spots on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, spot_id)
);

-- §8: Been tự động bật khi user đăng bài tại spot đó, không phải nút bấm.
-- Giữ bài đầu tiên đã kích hoạt nó để giải thích được vì sao trạng thái bật.
create table been (
    user_id       uuid        not null references users on delete cascade,
    spot_id       uuid        not null references spots on delete cascade,
    first_post_id uuid        references posts on delete set null,
    created_at    timestamptz not null default now(),
    primary key (user_id, spot_id)
);


-- ---------------------------------------------------------------------------
-- An toàn và thông báo (§10)
-- ---------------------------------------------------------------------------

create table reports (
    id           uuid primary key default gen_random_uuid(),
    reporter_id  uuid not null references users on delete cascade,
    -- Báo cáo có thể nhắm vào bài, bình luận hoặc user. Đúng một trong ba.
    post_id      uuid references posts on delete cascade,
    comment_id   uuid references comments on delete cascade,
    reported_user_id uuid references users on delete cascade,
    reason       text not null,
    created_at   timestamptz not null default now(),
    resolved_at  timestamptz,
    check (num_nonnulls(post_id, comment_id, reported_user_id) = 1)
);

create table notifications (
    id           uuid primary key default gen_random_uuid(),
    recipient_id uuid not null references users on delete cascade,
    type         text not null,
    actor_id     uuid references users on delete cascade,
    post_id      uuid references posts on delete cascade,
    spot_id      uuid references spots on delete cascade,
    created_at   timestamptz not null default now(),
    read_at      timestamptz
);

create index notifications_recipient_idx on notifications (recipient_id, created_at desc);
