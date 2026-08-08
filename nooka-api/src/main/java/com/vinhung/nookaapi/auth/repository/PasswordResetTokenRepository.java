package com.vinhung.nookaapi.auth.repository;

import com.vinhung.nookaapi.auth.model.entity.PasswordResetToken;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findTopByUserIdOrderByCreatedAtDesc(UUID userId);
}
