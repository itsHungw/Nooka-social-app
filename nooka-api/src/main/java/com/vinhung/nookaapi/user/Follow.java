package com.vinhung.nookaapi.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

/**
 * Follow một chiều (§3). Follow hai chiều được đối xử như bạn bè nhưng không
 * lưu riêng — nó suy ra được từ hai hàng, và lưu thừa thì sẽ có ngày lệch.
 *
 * <p>Hai đầu là {@code UUID} trần chứ không phải {@code @ManyToOne}: bảng này
 * là cạnh của đồ thị, luôn được hỏi bằng subquery "có tồn tại cạnh này không".
 * Ánh xạ sang {@code User} chỉ tạo thêm join mà không ai cần.
 */
@Entity
@Table(name = "follows")
@IdClass(Follow.Key.class)
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Follow {

    @Id
    @Column(name = "follower_id", nullable = false)
    private UUID followerId;

    @Id
    @Column(name = "followee_id", nullable = false)
    private UUID followeeId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * Khoá kép. {@code @Data} đúng chỗ ở đây — đây là value object, so sánh
     * theo toàn bộ field chính là ngữ nghĩa mong muốn, khác hẳn entity.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Key implements Serializable {
        private UUID followerId;
        private UUID followeeId;
    }
}
