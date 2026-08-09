-- Giai đoạn 3 — mục 8 của spec.
--
-- §6.3 của product spec cho sẵn ba tầng:
--   AI query                  -> Selection      (tạm thời, riêng một user)
--   User lưu / chia sẻ        -> Saved / Shared Selection
--   Nhiều người cùng nhu cầu  -> có thể nâng thành Topic


-- ---------------------------------------------------------------------------
-- selections
--
-- expires_at ép đúng điều §6.3 cảnh báo: "Mỗi lần user hỏi AI KHÔNG tạo ra một
-- Topic public. Nếu không, hệ thống sẽ có hàng nghìn topic gần trùng nhau."
-- Selection tạm phải tự chết; chỉ cái được lưu mới sống lâu.
--
-- query_text KHÔNG được chứa nội dung PRIVATE (R7). Không có cách nào ép bằng
-- constraint — đây là luật của code review, xem mục 13 của spec.
-- ---------------------------------------------------------------------------

create table selections (
    id              uuid primary key default gen_random_uuid(),
    owner_id        uuid not null references users on delete cascade,
    query_text      text,
    intent_slug     text,
    -- Ảnh chụp của một kết quả truy vấn, không phải quan hệ giữa hai thực thể:
    -- mảng đúng hơn bảng nối ở đây, và nó không bao giờ được join ngược.
    matched_tag_ids uuid[] not null default '{}',
    saved_at        timestamptz,   -- NULL = còn tạm
    expires_at      timestamptz,
    created_at      timestamptz not null default now()
);

create index selections_owner_saved_idx on selections (owner_id, created_at desc)
    where saved_at is not null;

-- Job dọn selection tạm đã hết hạn chỉ quét đúng phần nó cần.
create index selections_expiry_idx on selections (expires_at)
    where saved_at is null and expires_at is not null;

create table selection_items (
    selection_id   uuid not null references selections on delete cascade,
    spot_id        uuid not null references spots on delete cascade,
    rank           int  not null,
    score          numeric(8, 4),
    -- Thẻ nào khiến quán này lọt vào, để giải thích cho user. §14 cho phép AI
    -- "giải thích ngắn vì sao một place phù hợp" nhưng cấm bịa — đây là dữ liệu
    -- để câu giải thích bám vào.
    reason_tag_ids uuid[] not null default '{}',
    primary key (selection_id, spot_id),
    constraint selection_items_rank_key unique (selection_id, rank)
);


-- ---------------------------------------------------------------------------
-- Mắt xích khiến chỉ số north-star đo được
--
-- §15: "Tỷ lệ discovery session dẫn đến một trải nghiệm được xác nhận — tức có
-- bài đăng follow-up tại place đó."
--
-- posts.inspired_by_post_id chỉ nối bài với bài. Không có gì nối một lượt hỏi
-- với bài viết sau đó, nên chỉ số quan trọng nhất của sản phẩm hiện chỉ là ước
-- lượng. Một cột, cùng khuôn với inspired_by_post_id đã có.
-- ---------------------------------------------------------------------------

alter table posts add column from_selection_id uuid references selections on delete set null;

create index posts_from_selection_idx on posts (from_selection_id)
    where from_selection_id is not null;


-- ---------------------------------------------------------------------------
-- topics
--
-- §6.3: "Topic ở bản đầu chỉ là discovery lens do hệ thống tạo hoặc biên tập."
-- created_by NULL nghĩa là hệ thống tạo. §10 liệt "User tự tạo và quản lý Topic"
-- là ngoài phạm vi bản đầu — schema hỗ trợ được nhưng API không mở đường đó.
-- ---------------------------------------------------------------------------

create table topics (
    id           uuid primary key default gen_random_uuid(),
    slug         text not null unique,
    created_by   uuid references users on delete set null,
    area_id      uuid references areas on delete set null,
    published_at timestamptz,
    archived_at  timestamptz,
    created_at   timestamptz not null default now()
);

create index topics_published_idx on topics (area_id)
    where published_at is not null and archived_at is null;

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


-- ---------------------------------------------------------------------------
-- shared_links — dùng chung cho bản đồ cá nhân và selection được chia sẻ
--
-- Luật quan trọng nhất của bảng này là §13: "Share link không được bypass
-- visibility." Mở một link vẫn lọc bài viết qua PostAccess bằng danh tính NGƯỜI
-- ĐANG XEM, không phải của người chia sẻ. Chủ bản đồ thấy 34 quán; người lạ mở
-- link có thể chỉ thấy 12.
--
-- Đây là chỗ rất dễ làm sai: cách viết tự nhiên là render bản đồ theo góc nhìn
-- của chủ, và cách đó rò toàn bộ nội dung riêng tư. Xem R4.
--
-- revoked_at cho phép thu hồi link đã phát. Không có nó thì link phát ra là
-- vĩnh viễn.
-- ---------------------------------------------------------------------------

create table shared_links (
    id           uuid primary key default gen_random_uuid(),
    token        text not null unique,
    owner_id     uuid not null references users on delete cascade,
    kind         text not null
        constraint shared_links_kind_check check (kind in ('PROFILE_MAP', 'SELECTION')),
    selection_id uuid references selections on delete cascade,
    visibility   text not null
        constraint shared_links_visibility_check
        check (visibility in ('PUBLIC', 'FOLLOWERS', 'PRIVATE')),
    revoked_at   timestamptz,
    created_at   timestamptz not null default now(),
    -- Link kiểu SELECTION bắt buộc có selection_id; kiểu PROFILE_MAP bắt buộc
    -- không có. Một cột nullable mà không ép quan hệ này sẽ sinh ra dòng vô
    -- nghĩa mà không ai phát hiện.
    constraint shared_links_selection_check
        check ((kind = 'SELECTION') = (selection_id is not null))
);

create index shared_links_owner_idx on shared_links (owner_id)
    where revoked_at is null;
