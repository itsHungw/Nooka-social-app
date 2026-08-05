package com.vinhung.nookaapi.user.entity;

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
 * Chặn (§3): "chặn mọi tương tác hai chiều".
 *
 * <p>Hàng được lưu một chiều nhưng phải được đọc hai chiều. Ai chặn ai không
 * quan trọng với việc hiển thị — chỉ cần tồn tại một hàng giữa hai người là
 * cả hai không thấy bài của nhau nữa. Nếu chỉ kiểm tra một chiều thì người bị
 * chặn vẫn đọc được bài của người đã chặn mình.
 */
@Entity
@Table(name = "blocks")
@IdClass(Block.Key.class)
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Block {

    @Id
    @Column(name = "blocker_id", nullable = false)
    private UUID blockerId;

    @Id
    @Column(name = "blocked_id", nullable = false)
    private UUID blockedId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Key implements Serializable {
        private UUID blockerId;
        private UUID blockedId;
    }
}

