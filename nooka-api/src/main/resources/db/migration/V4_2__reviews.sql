-- Giai đoạn 2 — mục 7.4 và 7.5 của spec.
--
-- Luật biến câu trả lời thành thẻ hiện nằm cứng trong mobile:
--   if (reviewAnswers.stay === 'no')     earned.push('workFriendly');
--   if (reviewAnswers.price === 'cheap') earned.push('goodPrice');
--
-- §12 nói moat số hai là "metadata có cấu trúc từ lần đi thật — có ổ cắm không,
-- giờ nào ồn, hai người hết bao nhiêu, hợp dịp gì". Bốn thứ, hiện mới hỏi được
-- ba. Bộ câu hỏi SẼ đổi, nên nó phải là dữ liệu chứ không phải hai dòng if.

create table review_questions (
    id          uuid primary key default gen_random_uuid(),
    slug        text not null unique,          -- 'power' | 'stay' | 'price'
    answer_type text not null default 'SINGLE_CHOICE'
        constraint review_questions_type_check check (answer_type in ('SINGLE_CHOICE')),
    sort_order  int not null default 0,
    archived_at timestamptz,
    created_at  timestamptz not null default now()
);

create table review_question_options (
    id            uuid primary key default gen_random_uuid(),
    question_id   uuid not null references review_questions on delete cascade,
    value         text not null,               -- 'yes' | 'no' | 'cheap'
    sort_order    int not null default 0,
    created_at    timestamptz not null default now(),
    -- Chọn đáp án này thì cộng một phiếu cho thẻ này. NULL = không sinh thẻ.
    -- Đây là chỗ thay cho hai dòng if cứng ở trên; thêm luật mới là một INSERT.
    grants_tag_id uuid references tags on delete set null,
    constraint review_question_options_value_key unique (question_id, value)
);

create index review_question_options_tag_idx on review_question_options (grants_tag_id)
    where grants_tag_id is not null;


-- ---------------------------------------------------------------------------
-- reviews
--
-- CỐ Ý KHÔNG có post_id. Review hiện công khai trên trang quán kèm tên người
-- viết; giữ post_id là nối một thứ công khai với một thứ có thể PRIVATE, mà §13
-- nói PRIVATE là "chỉ chủ sở hữu".
--
-- Quyền viết review kiểm bằng bảng `been` đã có sẵn từ V1, không cần post_id.
-- ---------------------------------------------------------------------------

create table reviews (
    id         uuid primary key default gen_random_uuid(),
    spot_id    uuid not null references spots on delete cascade,
    author_id  uuid not null references users on delete cascade,
    body       text,
    -- Cho câu "You were here 2 hours, Tuesday afternoon" ở review.hereFor.
    visited_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    constraint reviews_body_length check (body is null or length(body) <= 500)
);

-- Một người một review cho mỗi quán, sửa được chứ không viết chồng. Partial
-- index để review đã xoá mềm không chặn việc viết lại.
create unique index reviews_author_spot_key on reviews (author_id, spot_id)
    where deleted_at is null;

create index reviews_spot_created_idx on reviews (spot_id, created_at desc)
    where deleted_at is null;

create table review_answers (
    review_id   uuid not null references reviews on delete cascade,
    question_id uuid not null references review_questions on delete restrict,
    option_id   uuid not null references review_question_options on delete restrict,
    primary key (review_id, question_id)
);

create index review_answers_option_idx on review_answers (option_id);


-- ---------------------------------------------------------------------------
-- spot_tag_fit — độ hợp, tách khỏi số phiếu
--
-- features/nooka/spots.ts giải thích vì sao hai thứ này khác nhau:
--   "'Muối 43 đúng là chỗ ăn khuya' không giống '7 người đã nói nó mở muộn'"
--
-- Suy ra từ tỉ lệ phiếu là mặc định; chấm tay là ngoại lệ. Khớp §11: đội seed
-- đi thật và biết quán nào ĐÚNG LÀ chỗ ăn khuya, nhưng không ai chấm tay nổi
-- 500 quán × 10 thẻ.
--
-- Thuộc module spot chứ không phải review: đây là thuộc tính của một địa điểm,
-- review chỉ là một trong nhiều nguồn góp phiếu.
-- ---------------------------------------------------------------------------

create table spot_tag_fit (
    spot_id    uuid not null references spots on delete cascade,
    tag_id     uuid not null references tags  on delete cascade,
    -- 1..4. NULL nghĩa là chưa ai chấm tay; xếp hạng đọc coalesce(manual_fit, suy ra).
    manual_fit smallint
        constraint spot_tag_fit_range_check check (manual_fit between 1 and 4),
    set_by     uuid references users on delete set null,
    set_at     timestamptz,
    note       text,
    primary key (spot_id, tag_id)
);
