package com.vinhung.nookaapi.spot;

import com.vinhung.nookaapi.common.BaseEntity;
import com.vinhung.nookaapi.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorColumn;
import jakarta.persistence.DiscriminatorType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Phần chung của Place và Experience (§7).
 *
 * <p>Spec khóa hai điều trông như mâu thuẫn: hai loại phải "ngang hàng, cùng
 * nhận Post, cùng nhận Want to go và Been, cùng xuất hiện trong feed dưới một
 * loại card", nhưng "nếu nhét Experience vào chung bảng Place thì khi thêm
 * booking sẽ phải migrate lại toàn bộ".
 *
 * <p>{@code JOINED} giải được cả hai: Post và Want to go trỏ vào {@code spots}
 * nên không cần biết loại nào, còn giá vé và lịch của Experience nằm ở bảng
 * riêng. Khi thêm booking, chỉ {@code experiences} thay đổi.
 */
@Entity
@Table(name = "spots")
@Inheritance(strategy = InheritanceType.JOINED)
@DiscriminatorColumn(name = "kind", discriminatorType = DiscriminatorType.STRING)
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public abstract class Spot extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "area_id", nullable = false)
    private Area area;

    /**
     * §7: place do user tạo chứ không lấy từ Google Places, nên bản trùng là
     * chuyện chắc chắn xảy ra. Giữ người tạo để lần dấu vết khi phải gộp.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    /**
     * Khi hai bản được xác nhận là một, bản thua trỏ vào bản thắng thay vì bị
     * xoá — Post cũ vẫn còn nguyên và vẫn đọc được.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "merged_into_id")
    private Spot mergedInto;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
