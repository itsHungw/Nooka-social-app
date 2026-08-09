-- Mục 6.2 của spec.
--
-- Bốn cột đầu đến từ frontend: `editProfile.location` là "Your district or
-- city" nên home_area_id trỏ vào areas (area chính là quận); profile.meta là
-- "Binh Thanh · joined Mar 2026" và nửa sau lấy từ created_at đã có.
--
-- locale cần vì email xác thực và push notification do server gửi — server
-- phải biết viết tiếng gì.
--
-- Hai cột cuối phục vụ xoá tài khoản hai bước ở mục 12.2: deleted_at ẩn ngay,
-- anonymized_at đánh dấu PII đã bị xoá thật sau thời gian ân hạn. Ân hạn tồn
-- tại để xử lý việc xoá tài khoản trong lúc giận rồi hôm sau muốn quay lại.
--
-- deleted_at tạo ra một trạng thái chưa từng có: bài viết còn nguyên, tác giả
-- đã ẩn. PostVisibilityRules phải loại bài của tài khoản này — xem R9.
--
-- KHÔNG thêm cột counter cho "128 check-in / 34 đã đi / 19 muốn đi" ở trang cá
-- nhân. Mục 4.3 chốt đếm lúc đọc qua module insight.
--
-- KHÔNG thêm cột last_seen_at. Cập nhật nó mỗi request nghĩa là mỗi lần user
-- chạm app là một lượt ghi vào bảng bận nhất hệ thống. Hiện diện ứng dụng nằm
-- ở Redis với TTL 2 phút (mục 5.4); Postgres chỉ giữ công tắc bật/tắt.

alter table users
    add column bio                  text,
    add column home_area_id         uuid references areas on delete set null,
    add column locale               varchar(5) not null default 'vi',
    add column show_activity_status boolean    not null default true,
    add column deleted_at           timestamptz,
    add column anonymized_at        timestamptz;

alter table users add constraint users_bio_length
    check (bio is null or length(bio) <= 300);

-- Truy vấn hồ sơ theo khu vực (§11 đo mật độ theo quận).
create index users_home_area_idx on users (home_area_id)
    where home_area_id is not null;

-- Mọi truy vấn user đang hoạt động đều lọc cột này, gồm cả R9 trong
-- PostVisibilityRules, nên nó cần index riêng.
create index users_active_idx on users (id) where deleted_at is null;
