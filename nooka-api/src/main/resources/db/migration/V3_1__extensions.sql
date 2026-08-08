-- Giai đoạn 1 của thiết kế database — mục 6.1 của spec.
--
-- Hai extension này phục vụ đúng một yêu cầu của §7 product spec:
--   "cần cơ chế chống trùng place ngay từ đầu (so tên + tọa độ trong bán kính,
--    gợi ý merge)"
--
-- pg_trgm cho phần "so tên", postgis cho phần "tọa độ trong bán kính".
--
-- Image bắt buộc là `postgis/postgis:17-3.5-alpine`; `postgres:17-alpine` không
-- có PostGIS. Xem README.md.
--
-- Ghi chú về version: Flyway chuẩn hoá dấu gạch dưới trong phần version thành
-- dấu chấm, nên file này là version 3.1 và sắp giữa V3 và V4. Giai đoạn 1 dùng
-- V3_1 tới V3_9; giai đoạn 2 bắt đầu từ V4.

create extension if not exists pg_trgm;
create extension if not exists postgis;
