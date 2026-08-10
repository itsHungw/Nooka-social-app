package com.vinhung.nookaapi.auth.repository;

import com.vinhung.nookaapi.auth.model.entity.AuthSession;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {

    Optional<AuthSession> findByAccessTokenHash(String accessTokenHash);

    Optional<AuthSession> findByRefreshTokenHash(String refreshTokenHash);

    List<AuthSession> findAllByUserIdAndRevokedAtIsNull(UUID userId);
}
