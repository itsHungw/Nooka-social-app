package com.vinhung.nookaapi.auth.model.entity;

import com.vinhung.nookaapi.shared.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "pending_registrations")
@Getter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PendingRegistration extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "code_hash", nullable = false)
    private String codeHash;

    @Column(name = "code_expires_at", nullable = false)
    private Instant codeExpiresAt;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "code_consumed_at")
    private Instant codeConsumedAt;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "completion_token_hash", unique = true)
    private String completionTokenHash;

    @Column(name = "completion_expires_at")
    private Instant completionExpiresAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    public void issueCode(String codeHash, Instant codeExpiresAt) {
        this.codeHash = codeHash;
        this.codeExpiresAt = codeExpiresAt;
        this.attempts = 0;
        this.codeConsumedAt = null;
        this.verifiedAt = null;
        this.completionTokenHash = null;
        this.completionExpiresAt = null;
        this.completedAt = null;
    }

    public void updatePasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public boolean isCodeUsableAt(Instant now, int maxAttempts) {
        return verifiedAt == null
                && codeConsumedAt == null
                && codeExpiresAt.isAfter(now)
                && attempts < maxAttempts;
    }

    public void incrementAttempts() {
        attempts++;
    }

    public void markVerified(Instant consumedAt, String completionTokenHash, Instant completionExpiresAt) {
        this.codeConsumedAt = consumedAt;
        this.verifiedAt = consumedAt;
        this.completionTokenHash = completionTokenHash;
        this.completionExpiresAt = completionExpiresAt;
    }

    public boolean isCompletableAt(Instant now) {
        return verifiedAt != null
                && completedAt == null
                && completionTokenHash != null
                && completionExpiresAt != null
                && completionExpiresAt.isAfter(now);
    }

    public void markCompleted(Instant completedAt) {
        this.completedAt = completedAt;
    }
}
