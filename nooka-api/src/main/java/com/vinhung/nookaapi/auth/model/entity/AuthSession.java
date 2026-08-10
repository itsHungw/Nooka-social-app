package com.vinhung.nookaapi.auth.model.entity;

import com.vinhung.nookaapi.shared.entity.BaseEntity;
import com.vinhung.nookaapi.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "auth_sessions")
@Getter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuthSession extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "access_token_hash", nullable = false, unique = true)
    private String accessTokenHash;

    @Column(name = "refresh_token_hash", nullable = false, unique = true)
    private String refreshTokenHash;

    @Column(name = "access_expires_at", nullable = false)
    private Instant accessExpiresAt;

    @Column(name = "refresh_expires_at", nullable = false)
    private Instant refreshExpiresAt;

    @Column(name = "last_used_at", nullable = false)
    private Instant lastUsedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public boolean isRefreshableAt(Instant now) {
        return !isRevoked() && refreshExpiresAt.isAfter(now);
    }

    public boolean isAccessValidAt(Instant now) {
        return !isRevoked() && accessExpiresAt.isAfter(now);
    }

    public void rotate(String newAccessHash, String newRefreshHash, Instant newAccessExpiry,
            Instant newRefreshExpiry, Instant usedAt) {
        accessTokenHash = newAccessHash;
        refreshTokenHash = newRefreshHash;
        accessExpiresAt = newAccessExpiry;
        refreshExpiresAt = newRefreshExpiry;
        lastUsedAt = usedAt;
    }

    public void revoke(Instant revokedAt) {
        this.revokedAt = revokedAt;
    }
}
