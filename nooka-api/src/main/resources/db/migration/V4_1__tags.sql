-- Giai đoạn 2 — mục 7.1, 7.2 và 7.3 của spec.
--
-- TAG_IDS hiện là mảng cứng 10 phần tử trong features/nooka/spots.ts, nên thêm
-- một thẻ là sửa code cộng phát hành app mới. Đưa vào database để thêm thẻ chỉ
-- còn là một INSERT.

create table tags (
    id          uuid primary key default gen_random_uuid(),
    slug        text not null unique,               -- 'quiet', 'workFriendly'
    kind        text not null
        constraint tags_kind_check check (kind in ('VIBE', 'FACILITY', 'PRICE', 'OCCASION')),
    -- Hiện trong sheet chọn thẻ sau khi đăng bài. Khớp PICKABLE_TAG_IDS: 7
    -- trong 10 thẻ; quietMusic, fast và takeaway chỉ đến từ nơi khác.
    pickable    boolean not null default true,
    sort_order  int not null default 0,
    -- Ngừng dùng chứ không xoá: thẻ cũ đã gắn vào hàng nghìn bài viết, xoá là
    -- mất lịch sử và làm gãy mọi thống kê đã tính.
    archived_at timestamptz,
    created_at  timestamptz not null default now()
);

create index tags_active_idx on tags (sort_order) where archived_at is null;


-- ---------------------------------------------------------------------------
-- Nhãn và từ đồng nghĩa
--
-- Đây là một thay đổi quy ước so với nooka-mobile/AGENTS.md, vốn nói từ đồng
-- nghĩa nằm ở locales/ và ranking.ts chỉ nhận danh sách đó.
--
-- Lý do phải đổi: matchTags() hiện chạy trên điện thoại và chỉ xếp hạng được 4
-- quán hardcoded. Với 500 quán thật, xếp hạng PHẢI chạy ở server — không thể
-- tải toàn bộ dữ liệu về máy để xếp. Server xếp hạng thì server cần từ đồng
-- nghĩa.
--
-- Ranh giới mới: chữ của GIAO DIỆN ở locales/, chữ của DỮ LIỆU ở database. Nút
-- "Muốn đi" là giao diện. Nhãn thẻ "Yên tĩnh" là dữ liệu, vì thẻ có thể thêm mà
-- không phát hành app.
-- ---------------------------------------------------------------------------

create table tag_translations (
    tag_id   uuid       not null references tags on delete cascade,
    locale   varchar(5) not null,
    label    text       not null,
    -- Ví dụ: ['yên', 'yên tĩnh', 'không ồn']. Dùng để khớp câu hỏi tự do ở
    -- "Hỏi Nooka", thay cho search.synonyms.<tagId> phía client.
    synonyms text[]     not null default '{}',
    primary key (tag_id, locale)
);


-- ---------------------------------------------------------------------------
-- post_vibe_tags: đổi từ chữ tự do sang khoá
--
-- V1 lưu `tag text`. Chữ tự do nghĩa là 'quiet', 'Quiet' và 'quite' là ba thẻ
-- khác nhau, và không có gì chặn — thống kê thẻ sẽ vỡ vụn mà không ai thấy.
--
-- Bảng chưa có đường ghi nào trong source hiện tại nên dựng lại thẳng. Nếu tới
-- lúc chạy migration mà đã có dữ liệu, thay bằng: tạo bảng mới, insert ... select
-- ghép theo slug, rồi mới drop bảng cũ.
--
-- Giới hạn 3 thẻ mỗi bài (frontend sheetTags.slice(0, 3)) không diễn đạt được
-- bằng constraint nên ép ở service, cùng cách V1 xử lý "ít nhất một ảnh".
-- ---------------------------------------------------------------------------

drop table post_vibe_tags;

create table post_vibe_tags (
    post_id uuid not null references posts on delete cascade,
    tag_id  uuid not null references tags  on delete restrict,
    primary key (post_id, tag_id)
);

create index post_vibe_tags_tag_idx on post_vibe_tags (tag_id);
