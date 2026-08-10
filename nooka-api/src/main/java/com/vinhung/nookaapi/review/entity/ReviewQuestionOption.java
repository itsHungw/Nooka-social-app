package com.vinhung.nookaapi.review.entity;

import com.vinhung.nookaapi.shared.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * Một đáp án của câu hỏi review, kèm thẻ mà nó sinh ra.
 *
 * <p>{@code grantsTagId} là chỗ thay cho hai dòng if cứng đang nằm trong mobile:
 *
 * <pre>
 * if (reviewAnswers.stay === 'no')     earned.push('workFriendly');
 * if (reviewAnswers.price === 'cheap') earned.push('goodPrice');
 * </pre>
 *
 * <p>Thành dữ liệu thì thêm một luật mới là một {@code INSERT}. Giữ dạng
 * {@code UUID} chứ không phải association vì module {@code review} không được
 * phụ thuộc entity của module {@code tag}; khoá ngoại vẫn có ở tầng database.
 */
@Entity
@Table(name = "review_question_options")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReviewQuestionOption extends BaseEntity {

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    /** Giá trị thô, ví dụ {@code yes}, {@code no}, {@code cheap}. */
    @Column(nullable = false)
    private String value;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    /** Chọn đáp án này thì cộng một phiếu cho thẻ này. {@code null} = không sinh thẻ. */
    @Column(name = "grants_tag_id")
    private UUID grantsTagId;
}
