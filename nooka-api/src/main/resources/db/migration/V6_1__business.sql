-- Giai đoạn 4 — mục 9 của spec.
--
-- §10 liệt "Business actor" là ngoài phạm vi bản đầu; §12 đặt nó ở giai đoạn 1
-- của lộ trình, tháng 6–12:
--
--   "Nooka for Business — MIỄN PHÍ. Quán claim trang, xem ai đang muốn đến, giờ
--    nào đông, khách nói gì. Mục tiêu: 200 quán claim, không thu tiền... và nó
--    làm sạch dữ liệu địa điểm giúp bạn."
--
-- CLAIM, KHÔNG PHẢI CREATE. Place tồn tại trước do user tạo hoặc đội seed nhập
-- tay; chủ quán nhận quyền sau. Cho chủ quán tạo place là làm gãy §11 (đội seed
-- không phải chủ quán), làm gãy vòng lặp cốt lõi (check-in bắt buộc có spot), và
-- biến Nooka thành đúng thứ §1 nói nó không phải: "nền tảng review doanh nghiệp".

create table spot_claims (
    id            uuid primary key default gen_random_uuid(),
    spot_id       uuid not null references spots on delete cascade,
    claimant_id   uuid not null references users on delete cascade,
    -- Bằng chứng: ảnh giấy phép, email theo tên miền quán, số trên bảng hiệu...
    -- Hình dạng sẽ đổi nhiều lần trong 6 tháng đầu, và mỗi lần đổi không nên là
    -- một migration. Đây là chỗ jsonb thật sự đáng dùng.
    evidence      jsonb not null default '{}',
    status        text not null default 'PENDING'
        constraint spot_claims_status_check
        check (status in ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN')),
    reviewed_by   uuid references users on delete set null,
    reviewed_at   timestamptz,
    reject_reason text,
    created_at    timestamptz not null default now()
);

-- Partial unique index: chỉ ép duy nhất trên dòng đang chờ. Một quán có thể có
-- nhiều hồ sơ đã bị từ chối trong lịch sử, nhưng không bao giờ có hai hồ sơ chờ
-- cùng lúc — nếu không thì hai người cùng nhận một quán và người duyệt không có
-- căn cứ nào để chọn.
create unique index spot_claims_one_pending_idx on spot_claims (spot_id)
    where status = 'PENDING';

create index spot_claims_claimant_idx on spot_claims (claimant_id, created_at desc);


-- ---------------------------------------------------------------------------
-- spot_managers
--
-- RANH GIỚI QUYỀN, phần quan trọng nhất của giai đoạn này.
--
-- Chủ quán sau khi được duyệt ĐƯỢC sửa: spots.name, places.address,
-- places.latitude/longitude, spot_hours.
--
-- Chủ quán KHÔNG ĐƯỢC: xoá bài viết, xoá review, sửa thẻ, ẩn nội dung tiêu cực.
--
-- §1 chốt Nooka "không phải nền tảng review doanh nghiệp". Cho chủ quán động vào
-- nội dung là biến nó thành đúng thứ đó, và giết moat số 2 ở §12 vì metadata chỉ
-- đáng tin khi chủ quán không sửa được.
--
-- Đây là luật cấp service, không phải constraint — bảng này chỉ ghi ai là chủ.
-- Nó sẽ bị áp lực thương mại xói mòn ở §12 giai đoạn 2 khi bắt đầu bán quảng
-- cáo, nên phải có test riêng. Xem R5.
-- ---------------------------------------------------------------------------

create table spot_managers (
    spot_id    uuid not null references spots on delete cascade,
    user_id    uuid not null references users on delete cascade,
    role       text not null default 'OWNER'
        constraint spot_managers_role_check check (role in ('OWNER', 'STAFF')),
    granted_by uuid references users on delete set null,
    granted_at timestamptz not null default now(),
    revoked_at timestamptz,
    primary key (spot_id, user_id)
);

create index spot_managers_user_idx on spot_managers (user_id)
    where revoked_at is null;
