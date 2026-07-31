package com.vinhung.nookaapi.user;

import com.vinhung.nookaapi.common.BaseEntity;
import com.vinhung.nookaapi.post.Visibility;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Không có cột mật khẩu và sẽ không bao giờ có: Firebase Auth phát hành token,
 * backend chỉ verify (§20 của spec).
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {

    @Column(name = "firebase_uid", nullable = false, unique = true)
    private String firebaseUid;

    @Column(nullable = false)
    private String username;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "avatar_url")
    private String avatarUrl;

    /**
     * §13: tài khoản mới mặc định không phải Public.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "default_post_visibility", nullable = false)
    @lombok.Builder.Default
    private Visibility defaultPostVisibility = Visibility.FOLLOWERS;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
