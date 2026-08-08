-- Mục 6.5 của spec.
--
-- Frontend hiện "Open · until 10pm" và cần biết quán có đang mở không. Dữ liệu
-- này KHÔNG lấy từ Google: openNow là Content của Google và điều khoản của họ
-- cấm lưu. Giờ mở cửa là bảng của Nooka, do user và chủ quán đóng góp.
--
-- Không có dòng cho một ngày nghĩa là đóng cửa ngày đó. Không cần cột is_closed.
--
-- closes_at < opens_at nghĩa là đóng cửa sau nửa đêm (quán ăn khuya mở 18:00
-- đóng 02:00). Không tách thành cột riêng vì phép so sánh vẫn viết được, và một
-- cột boolean thừa là một cột nữa phải nhớ giữ đồng bộ.
--
-- Kiểu `time` chứ không phải `timestamptz`: "mở 7 giờ sáng" là một câu nói về
-- giờ địa phương, không phải một thời điểm tuyệt đối. cities.timezone ở V3_2 là
-- chỗ đổi nó thành thời điểm khi cần so với now().
--
-- source tồn tại vì cùng một quán sẽ có giờ do user điền và giờ do chủ quán
-- điền sau khi claim ở giai đoạn 4. Chủ đè user — luật đó ở service, cột này là
-- thứ cho phép service biết ai điền.
--
-- Bảng này chỉ áp dụng cho spots.kind = 'PLACE'. Experience có starts_at và
-- ends_at riêng từ V1 vì nó là sự kiện có ngày giờ cụ thể, không phải lịch mở
-- cửa hàng tuần. Ràng buộc đó không diễn đạt được bằng constraint trên một bảng
-- nên ép ở service.

create table spot_hours (
    id          uuid primary key default gen_random_uuid(),
    spot_id     uuid not null references spots on delete cascade,
    -- 0 = Chủ nhật, khớp với extract(dow) của PostgreSQL.
    day_of_week smallint not null
        constraint spot_hours_day_check check (day_of_week between 0 and 6),
    opens_at    time not null,
    closes_at   time not null,
    source      text not null
        constraint spot_hours_source_check check (source in ('USER', 'OWNER', 'SEED')),
    updated_by  uuid references users on delete set null,
    updated_at  timestamptz not null default now(),
    constraint spot_hours_slot_key unique (spot_id, day_of_week, opens_at)
);

create index spot_hours_spot_idx on spot_hours (spot_id, day_of_week);
