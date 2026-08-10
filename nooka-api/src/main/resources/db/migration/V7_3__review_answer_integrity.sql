-- review_answers giữ question_id để khóa "mỗi review trả lời một lần
-- cho mỗi câu hỏi", còn option_id chọn đáp án. Hai foreign key rời rạc
-- không chứng minh option thuộc đúng question, nên ghép chúng thành một
-- foreign key tổ hợp.

alter table review_question_options add constraint review_question_options_question_id_id_key
    unique (question_id, id);

alter table review_answers add constraint review_answers_question_option_fkey
    foreign key (question_id, option_id)
    references review_question_options (question_id, id)
    on delete restrict;
