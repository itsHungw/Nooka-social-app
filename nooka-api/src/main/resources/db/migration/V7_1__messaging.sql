-- Giai đoạn 5 — mục 10 của spec.
--
-- §10 liệt "Inbox đầy đủ và message request" là ngoài phạm vi bản đầu, kèm:
-- "Chat 1-1 chỉ làm khi có bằng chứng người ta thật sự cần." Frontend đã dựng
-- xong màn hình, tức prototype đi trước phạm vi — giai đoạn này đứng cuối là
-- chủ ý.

create table conversations (
    id             uuid primary key default gen_random_uuid(),
    kind           text not null default 'DIRECT'
        constraint conversations_kind_check check (kind in ('DIRECT', 'GROUP')),
    -- Quán ghim ở đầu luồng chat. Thuộc về cuộc trò chuyện chứ không thuộc về
    -- từng người, khác hẳn ba cột ở conversation_members bên dưới.
    pinned_spot_id uuid references spots on delete set null,
    created_by     uuid not null references users on delete cascade,
    created_at     timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- conversation_members
--
-- BA CỘT ĐẶT ĐÚNG CHỖ, và chỗ đặt là điểm dễ sai nhất phần này.
--
-- nickname, wallpaper và muted_until nằm ở bảng thành viên chứ không ở
-- conversations, vì chúng là "của tôi về cuộc trò chuyện này", không phải "của
-- cuộc trò chuyện". Tôi đặt biệt danh cho Linh thì Linh không được thấy; tôi đổi
-- ảnh nền thì chỉ tôi thấy. Đặt nhầm lên conversations là hai người dùng chung
-- một biệt danh, và lỗi chỉ lộ ra khi có người phàn nàn.
--
-- last_read_at thay cho cả một bảng "đã xem" riêng — bảng đó sẽ lớn bằng bảng
-- tin nhắn. "Seen 14:02" là last_read_at của người kia; số tin chưa đọc là số
-- tin sau mốc đó.
--
-- accepted_at giải quyết mục "Requests" mà không cần bảng nào. §3 đã bỏ friend
-- request, nhưng tab Messages vẫn có Requests — đó là chuyện khác: người tôi
-- không follow nhắn tôi. Người lạ nhắn thì dòng thành viên của tôi có
-- accepted_at rỗng; tôi trả lời thì điền vào.
-- ---------------------------------------------------------------------------

create table conversation_members (
    conversation_id uuid not null references conversations on delete cascade,
    user_id         uuid not null references users on delete cascade,
    nickname        text,
    wallpaper       text,
    muted_until     timestamptz,
    last_read_at    timestamptz,
    accepted_at     timestamptz,
    joined_at       timestamptz not null default now(),
    left_at         timestamptz,
    primary key (conversation_id, user_id)
);

create index conversation_members_user_idx on conversation_members (user_id)
    where left_at is null;


-- ---------------------------------------------------------------------------
-- messages
--
-- kind tồn tại để ba bộ lọc ở tab Messages (all / invites / posts) thành một
-- điều kiện có index, thay vì phải suy từ việc cột nào khác NULL.
--
-- KHÔNG có cột last_message_at trên conversations. Sắp danh sách hội thoại theo
-- tin mới nhất làm bằng lateral join trên index dưới đây — đúng quyết định "đếm
-- lúc đọc" ở mục 4.3. Nếu có ngày nó chậm, last_message_at là thứ đầu tiên nên
-- thêm, nhưng thêm khi đo được chứ không thêm phòng xa.
--
-- Tin nhắn kiểu POST đọc bài viết qua PostAccess với danh tính NGƯỜI NHẬN. Người
-- nhận không có quyền xem thì thẻ bài hiện dạng không khả dụng; nếu không, chia
-- sẻ vào chat thành đường vòng qua luật riêng tư.
-- ---------------------------------------------------------------------------

create table messages (
    id              uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references conversations on delete cascade,
    sender_id       uuid not null references users on delete cascade,
    kind            text not null default 'TEXT'
        constraint messages_kind_check check (kind in ('TEXT', 'SPOT', 'POST', 'INVITE')),
    body            text,
    spot_id         uuid references spots on delete set null,
    post_id         uuid references posts on delete set null,
    created_at      timestamptz not null default now(),
    deleted_at      timestamptz,
    constraint messages_text_check check (kind <> 'TEXT' or body    is not null),
    constraint messages_spot_check check (kind <> 'SPOT' or spot_id is not null),
    constraint messages_post_check check (kind <> 'POST' or post_id is not null)
);

-- Sắp theo (created_at, id) chứ không chỉ created_at. Hai lý do:
--
-- 1. `default now()` trả về thời điểm bắt đầu TRANSACTION, không phải thời điểm
--    câu lệnh. Chèn nhiều tin trong một transaction — seeder, hay một tin kèm
--    tin hệ thống — cho ra created_at giống hệt nhau, và thứ tự thành tuỳ tiện.
--    Ai cần mốc thời gian khác nhau trong cùng transaction phải dùng
--    clock_timestamp().
-- 2. Phân trang keyset cần một khoá sắp xếp toàn phần; chỉ created_at là không
--    đủ khi có hai tin trùng mốc, và trang sẽ lặp hoặc nhảy cóc.
create index messages_conversation_created_idx
    on messages (conversation_id, created_at desc, id desc)
    where deleted_at is null;

-- Bộ lọc "invites" và "posts" ở tab Messages.
create index messages_kind_idx on messages (conversation_id, kind, created_at desc)
    where deleted_at is null and kind <> 'TEXT';


-- ---------------------------------------------------------------------------
-- message_invites
--
-- Tách khỏi messages vì chỉ tin nhắn kiểu INVITE mới có ba cột này, và vì lời
-- mời có vòng đời riêng: gửi, rồi được trả lời. §7 khoá "Invite bind vào Place".
--
-- §10 liệt "Invite với RSVP nhiều người" là ngoài phạm vi bản đầu, nên bảng này
-- chỉ đủ cho lời mời 1-1: một trạng thái, một mốc trả lời.
-- ---------------------------------------------------------------------------

create table message_invites (
    message_id   uuid primary key references messages on delete cascade,
    spot_id      uuid not null references spots on delete restrict,
    proposed_at  timestamptz,
    status       text not null default 'PENDING'
        constraint message_invites_status_check
        check (status in ('PENDING', 'ACCEPTED', 'DECLINED')),
    responded_at timestamptz
);
