package com.vinhung.nookaapi.user.entity;

import com.vinhung.nookaapi.shared.entity.BaseEntity;
import com.vinhung.nookaapi.shared.model.Visibility;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.UpdateTimestamp;


@Entity
@Table(name = "users")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    @Column(nullable = false)
    private String username;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "avatar_url")
    private String avatarUrl;

    /** Giới thiệu ngắn ở trang cá nhân. Nhiều dòng; database chặn quá 300 ký tự. */
    private String bio;

    /**
     * Quận hoặc thành phố người dùng khai ở `editProfile.location`.
     *
     * <p>Giữ dạng UUID chứ không phải association vì module {@code user} không
     * được phụ thuộc entity của module {@code spot}.
     */
    @Column(name = "home_area_id")
    private UUID homeAreaId;

    /** Ngôn ngữ server dùng khi gửi email và push notification cho người này. */
    @Column(nullable = false, length = 5)
    @lombok.Builder.Default
    private String locale = "vi";

    /**
     * Công tắc tắt chấm xanh "đang online" ở màn chat.
     *
     * <p>Bản thân dấu hiệu hoạt động nằm ở Redis với TTL ngắn, không ở đây —
     * ghi mỗi request vào bảng này là tự tạo nút thắt.
     */
    @Column(name = "show_activity_status", nullable = false)
    @lombok.Builder.Default
    private boolean showActivityStatus = true;

    /** §3/§13: cổng ngoài cùng, override cả Post mang audience PUBLIC. */
    @Column(name = "private_profile", nullable = false)
    @lombok.Builder.Default
    private boolean privateProfile = false;

    /**
     * Bước 1 của xoá tài khoản: ẩn khỏi mọi bề mặt ngay lập tức.
     *
     * <p>Bài viết của tài khoản có cột này khác null phải biến mất khỏi feed của
     * mọi người, kể cả chính tác giả — xem R9 và {@code PostVisibilityRules}.
     */
    @Column(name = "deleted_at")
    private Instant deletedAt;

    /** Bước 2: PII đã bị xoá thật sau thời gian ân hạn. */
    @Column(name = "anonymized_at")
    private Instant anonymizedAt;

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

    public boolean isEmailVerified() {
        return emailVerifiedAt != null;
    }

    public void verifyEmail(Instant verifiedAt) {
        emailVerifiedAt = verifiedAt;
    }

    public void changePassword(String newPasswordHash) {
        passwordHash = newPasswordHash;
    }
}
