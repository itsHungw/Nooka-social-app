-- Mục 4.4 và 6.7 của spec.
--
-- BaseEntity đã đổi sang UUID v7 để bản ghi mới dồn về mép phải của B-tree thay
-- vì rơi ngẫu nhiên khắp index. Nhưng v7 nhét mốc thời gian vào 48 bit đầu, tức
-- là id KỂ RA thời điểm tạo — mà posts.hide_time tồn tại chính để giấu thứ đó,
-- và id thì nằm trong URL.
--
-- Giải bằng hai định danh: posts.id (v7) chỉ dùng nội bộ và trong khoá ngoại;
-- public_id (ngẫu nhiên) là thứ duy nhất xuất hiện trong API và URL.
--
-- gen_random_uuid() sinh v4 hoàn toàn ngẫu nhiên. Ở đây tính ngẫu nhiên là mục
-- đích chứ không phải khuyết điểm: nó không kể thời gian và không cho ai dò ra
-- số bài viết của hệ thống.
--
-- Dòng đã có nhận giá trị ngẫu nhiên nhờ default, nên not null an toàn.

alter table posts add column public_id uuid not null default gen_random_uuid();

create unique index posts_public_id_key on posts (public_id);
