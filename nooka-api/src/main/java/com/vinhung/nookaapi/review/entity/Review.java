package com.vinhung.nookaapi.review.entity;

import com.vinhung.nookaapi.shared.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Ba câu trả lời có cấu trúc cộng một dòng tự do về một địa điểm.
 *
 * <p>Đây là nguồn của moat số hai ở §12: "metadata có cấu trúc từ lần đi thật —
 * có ổ cắm không, giờ nào ồn, hai người hết bao nhiêu, hợp dịp gì. Google Maps
 * review dạng văn xuôi không trích xuất được ở quy mô."
 *
 * <p><b>Cố ý không có {@code postId}.</b> Review hiện công khai trên trang quán
 * kèm tên người viết; nối nó với một bài có thể {@code PRIVATE} là mở đường rò
 * rỉ, mà §13 nói {@code PRIVATE} là "chỉ chủ sở hữu". Quyền viết review kiểm
 * bằng bảng {@code been}, vốn đã có từ V1.
 */
@Entity
@Table(name = "reviews")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Review extends BaseEntity {

    @Column(name = "spot_id", nullable = false)
    private UUID spotId;

    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    /** Một dòng cho người tiếp theo. Database chặn quá 500 ký tự. */
    private String body;

    /** Cho câu "You were here 2 hours, Tuesday afternoon" ở màn review. */
    @Column(name = "visited_at")
    private Instant visitedAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
