-- Want to go vừa là ý định ghé lần đầu, vừa là danh sách muốn quay lại. Vì vậy row
-- này được phép tồn tại cùng Been; check-in không tự xoá nó.
--
-- Nếu intent bắt đầu từ một Post, giữ Post nguồn để khi user thật sự ghé, service
-- có thể copy nó sang posts.inspired_by_post_id. Khoá ngoại tổ hợp chặn việc gắn
-- nguồn của Spot A cho intent ở Spot B.

alter table posts add constraint posts_spot_id_id_key
    unique (spot_id, id);

alter table want_to_go add column source_post_id uuid;

alter table want_to_go add constraint want_to_go_source_post_fkey
    foreign key (spot_id, source_post_id)
    references posts (spot_id, id)
    on delete set null (source_post_id);

create index want_to_go_source_post_idx on want_to_go (source_post_id)
    where source_post_id is not null;
