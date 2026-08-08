-- Mục 6.4 của spec.
--
-- latitude/longitude vẫn là numeric(9,6) và vẫn là nguồn sự thật. Lý do ở
-- V1__baseline.sql không đổi: "sai số dấu phẩy động ở vĩ độ là sai số vị trí
-- thật."
--
-- geog là cột SINH TỰ ĐỘNG, không phải cột thường. Không có đường ghi nào vào
-- nó nên nó không thể lệch với lat/lng — khác hẳn một cột thường phải nhớ cập
-- nhật ở mọi chỗ, và chỗ quên sẽ là chỗ chống trùng im lặng bỏ sót.
--
-- Ép kiểu double precision là tường minh: generated column bắt buộc toàn bộ
-- biểu thức phải IMMUTABLE, và phép ép numeric -> double precision thoả điều
-- kiện đó.
--
-- Hibernate không cần biết cột này. `ddl-auto=validate` chỉ kiểm rằng mọi
-- property của entity có cột tương ứng; cột thừa trong database thì bỏ qua.

alter table places add column geog geography(Point, 4326)
    generated always as (
        ST_SetSRID(ST_MakePoint(longitude::double precision,
                                latitude::double precision), 4326)::geography
    ) stored;

-- GiST cho ST_DWithin: thu hẹp theo bán kính trước, rồi mới so tên.
create index places_geog_idx on places using gist (geog);

-- GIN trigram cho so tên gần giống.
--
-- Lưu ý: `similarity(a, b) > x` KHÔNG dùng được index này; chỉ toán tử `%` (với
-- pg_trgm.similarity_threshold) mới dùng được. Ở luồng chống trùng điều đó chấp
-- nhận được vì ST_DWithin đã thu hẹp xuống vài địa điểm trước khi so tên. Index
-- vẫn được tạo cho universal search ở §6.1 product spec, nơi tìm theo tên không
-- có ràng buộc bán kính.
create index spots_name_trgm_idx on spots using gin (lower(name) gin_trgm_ops);
