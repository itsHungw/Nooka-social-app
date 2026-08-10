-- Mục 6.4 của spec.
--
-- §7: "cần cơ chế chống trùng place ngay từ đầu (so tên + tọa độ trong bán
-- kính, gợi ý merge)". V3_5 lo phần phát hiện lúc tạo; bảng này lo phần lọt
-- lưới, và cũng là chỗ dọn hậu quả của đua ghi.
--
-- Đua ghi: hai người tạo cùng một quán cùng lúc, cả hai chạy kiểm tra chống
-- trùng, cả hai thấy sạch, cả hai chèn. Có thể chặn bằng
-- unique (area_id, lower(name)), nhưng như thế thì hai chi nhánh cùng tên
-- trong một quận không tạo được — sai kiểu khó chịu hơn. Nên chấp nhận cuộc
-- đua và để job nền dọn qua bảng này.
--
-- check (lower_spot_id < higher_spot_id) cộng unique là thứ khiến database TỰ
-- chặn (A,B) và (B,A) thành hai dòng. Không có nó thì bảng chống trùng tự sinh
-- ra bản trùng của chính nó.
--
-- Khi gộp: spots.merged_into_id (đã có ở V1) trỏ bản thua sang bản thắng và
-- bài viết cũ giữ nguyên. Nhưng want_to_go và been có khoá chính
-- (user_id, spot_id) nên một user có thể đang giữ CẢ HAI bản — job gộp phải
-- nhập hai dòng thành một, giữ created_at sớm hơn. Xem R8 trong spec.

create table spot_merge_candidates (
    id              uuid primary key default gen_random_uuid(),
    lower_spot_id   uuid not null references spots on delete cascade,
    higher_spot_id  uuid not null references spots on delete cascade,
    reason          text not null
        constraint spot_merge_candidates_reason_check
        check (reason in ('NAME_AND_RADIUS', 'REPORTED', 'MANUAL')),
    distance_m      numeric(10, 2),
    name_similarity numeric(4, 3),
    status          text not null default 'PENDING'
        constraint spot_merge_candidates_status_check
        check (status in ('PENDING', 'MERGED', 'REJECTED')),
    detected_at     timestamptz not null default now(),
    resolved_at     timestamptz,
    resolved_by     uuid references users on delete set null,
    constraint spot_merge_candidates_order_check check (lower_spot_id < higher_spot_id),
    constraint spot_merge_candidates_pair_key unique (lower_spot_id, higher_spot_id)
);

-- Hàng đợi xử lý: chỉ quét dòng đang chờ, cũ nhất trước.
create index spot_merge_candidates_pending_idx on spot_merge_candidates (detected_at)
    where status = 'PENDING';
