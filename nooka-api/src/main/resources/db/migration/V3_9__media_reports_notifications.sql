-- Mục 6.6, 6.8 và 6.9 của spec.


-- ---------------------------------------------------------------------------
-- post_media: đặt sẵn cột cho luồng ảnh (mục 12.1)
--
-- R1 khoá: strip EXIF ở server, client không bao giờ được coi là đã sạch. Luật
-- đó loại kiến trúc phổ biến "client xin presigned URL rồi tải thẳng lên S3",
-- vì ảnh còn nguyên EXIF đã nằm trong kho trước khi server kịp chạm vào.
--
-- Bản đầu dùng cách qua server và LUÔN ghi 'READY'. Cột status vẫn có mặt từ
-- bây giờ để ngày chuyển sang xử lý bất đồng bộ chỉ phải đổi luồng, không phải
-- migrate một bảng ảnh đã có hàng triệu dòng.
--
-- storage_key tách khỏi url vì đổi CDN hay đổi nhà cung cấp kho thì url đổi hết
-- còn storage_key không đổi.
-- ---------------------------------------------------------------------------

alter table post_media
    add column status       text not null default 'READY'
        constraint post_media_status_check
        check (status in ('PENDING', 'PROCESSING', 'READY', 'FAILED')),
    add column storage_key  text,
    add column content_type text,
    add column bytes        bigint,
    add column checksum     text;


-- ---------------------------------------------------------------------------
-- reports: vá một lỗ về an toàn có trong V1
--
-- V1 để reporter_id ... on delete cascade. Hệ quả: người bị quấy rối gửi báo
-- cáo rồi rời app vì quá mệt, và bằng chứng đi theo họ trong khi kẻ kia sạch hồ
-- sơ. Báo cáo phải sống lâu hơn tài khoản đã gửi nó.
-- ---------------------------------------------------------------------------

alter table reports drop constraint reports_reporter_id_fkey;
alter table reports alter column reporter_id drop not null;
alter table reports add constraint reports_reporter_id_fkey
    foreign key (reporter_id) references users on delete set null;


-- ---------------------------------------------------------------------------
-- notifications: tránh bẫy thêm một cột cho mỗi loại thông báo
--
-- Loại mới sẽ cần tham chiếu mới: lời mời chat cần conversation_id, duyệt claim
-- cần claim_id, nhắc review cần review_id. Thêm một cột cho mỗi loại dẫn tới
-- một bảng 20 cột mà mỗi dòng chỉ dùng hai.
--
-- Giữ actor_id/post_id/spot_id làm cột thật vì chúng cần index và cần
-- on delete cascade. Phần đặc thù từng loại vào payload.
--
-- group_key cộng partial unique index chặn 40 dòng thông báo cho một bài:
-- "3 người đã thích bài của bạn" thay vì ba dòng. Chỉ ép trên dòng chưa đọc —
-- đã đọc rồi thì một nhóm mới được phép bắt đầu.
-- ---------------------------------------------------------------------------

alter table notifications
    add column payload    jsonb       not null default '{}',
    add column group_key  text,
    add column updated_at timestamptz not null default now();

create unique index notifications_group_idx on notifications (recipient_id, group_key)
    where group_key is not null and read_at is null;
