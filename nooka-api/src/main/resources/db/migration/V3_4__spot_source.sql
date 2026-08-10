-- Mục 6.4 của spec, và §7 của product spec.
--
-- §7 chốt: "User-created + seed thủ công. Không dùng Google Places API làm
-- nguồn dữ liệu gốc." Lý do §7 đưa ra: điều khoản của Google cấm xây dựng và
-- lưu trữ database địa điểm riêng từ dữ liệu của họ, tức là nó phá đúng moat
-- ở §12.
--
-- Việc danh sách này KHÔNG có 'GOOGLE' là cố ý. Đó là thứ chặn người sau vô
-- tình thêm một đường ghi dữ liệu Google vào database. Thêm giá trị đó nghĩa
-- là sửa cả product spec, không phải sửa mỗi migration.

alter table spots
    add column source text not null default 'USER_CREATED'
        constraint spots_source_check check (source in ('USER_CREATED', 'SEEDED'));
