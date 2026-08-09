-- Latitude và longitude là một cặp. Cho phép cả hai cùng rỗng khi Place
-- chưa có tọa độ, nhưng không cho phép nửa tọa độ vì generated column
-- geog khi đó sẽ thành NULL và luồng chống trùng im lặng bỏ sót Place.

alter table places add constraint places_coordinate_pair_check
    check (num_nonnulls(latitude, longitude) in (0, 2));
