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
 * Danh sách close friends (§3): một chiều, riêng tư, và không thông báo cho
 * người được thêm. Vì vậy không có cột trạng thái — không có gì để phía kia
 * chấp nhận hay từ chối.
 *
 * <p>{@code ownerId} là người lập danh sách. Chiều này quan trọng: bài
 * {@code CLOSE_FRIENDS} của A hiện với người trong danh sách của A, không phải
 * với người đã đưa A vào danh sách của họ.
 */
@Entity
@Table(name = "close_friends")
@IdClass(CloseFriend.Key.class)
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CloseFriend {

    @Id
    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Id
    @Column(name = "friend_id", nullable = false)
    private UUID friendId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Key implements Serializable {
        private UUID ownerId;
        private UUID friendId;
    }
}
