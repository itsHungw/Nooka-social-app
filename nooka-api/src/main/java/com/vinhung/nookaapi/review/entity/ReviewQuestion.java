package com.vinhung.nookaapi.review.entity;

import com.vinhung.nookaapi.shared.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * Một câu hỏi trong bộ ba câu sau khi rời quán.
 *
 * <p>Là dữ liệu chứ không phải enum, vì §12 liệt bốn loại metadata cần thu thập
 * mà hiện mới hỏi được ba. Thêm câu hỏi thứ tư phải là một {@code INSERT}, không
 * phải một lần phát hành app.
 */
@Entity
@Table(name = "review_questions")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReviewQuestion extends BaseEntity {

    /** Khoá i18n phía client, ví dụ {@code power}, {@code stay}, {@code price}. */
    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "answer_type", nullable = false)
    @Builder.Default
    private String answerType = "SINGLE_CHOICE";

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    /** Ngừng hỏi, nhưng câu trả lời cũ vẫn còn giá trị thống kê. */
    @Column(name = "archived_at")
    private Instant archivedAt;
}
