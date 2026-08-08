package com.vinhung.nookaapi.review.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Một câu trả lời trong một review.
 *
 * <p>Khoá kép {@code (review_id, question_id)} ép mỗi câu hỏi chỉ được trả lời
 * một lần trong một review — ở tầng database, không phải ở tầng Java.
 */
@Entity
@Table(name = "review_answers")
@IdClass(ReviewAnswer.Key.class)
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReviewAnswer {

    @Id
    @Column(name = "review_id", nullable = false)
    private UUID reviewId;

    @Id
    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(name = "option_id", nullable = false)
    private UUID optionId;

    /**
     * Khoá kép. {@code @Data} đúng chỗ ở đây — đây là value object, so sánh theo
     * toàn bộ field chính là ngữ nghĩa mong muốn, khác hẳn entity.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Key implements Serializable {
        private UUID reviewId;
        private UUID questionId;
    }
}
