package com.vinhung.nookaapi.auth.integration;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.vinhung.nookaapi.auth.model.entity.AuthSession;
import com.vinhung.nookaapi.auth.repository.AuthSessionRepository;
import com.vinhung.nookaapi.auth.service.AuthTokenSupport;
import com.vinhung.nookaapi.user.spi.TokenVerificationException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AuthTokenVerifierTest {

    @Test
    void rejectsOtherwiseValidSessionOfDeletedAccount() {
        Instant now = Instant.parse("2026-08-10T09:00:00Z");
        com.vinhung.nookaapi.user.entity.User deleted =
                mock(com.vinhung.nookaapi.user.entity.User.class);
        given(deleted.getId()).willReturn(UUID.randomUUID());
        given(deleted.getDeletedAt()).willReturn(now.minusSeconds(1));
        AuthSession session = AuthSession.builder()
                .user(deleted)
                .accessTokenHash("hash")
                .refreshTokenHash("refresh")
                .accessExpiresAt(now.plusSeconds(60))
                .refreshExpiresAt(now.plusSeconds(120))
                .lastUsedAt(now)
                .build();
        AuthSessionRepository sessions = mock(AuthSessionRepository.class);
        AuthTokenSupport support = mock(AuthTokenSupport.class);
        given(support.hash("token")).willReturn("hash");
        given(sessions.findByAccessTokenHash("hash")).willReturn(Optional.of(session));
        AuthTokenVerifier verifier = new AuthTokenVerifier(
                sessions, support, Clock.fixed(now, ZoneOffset.UTC));

        assertThatThrownBy(() -> verifier.verify("token"))
                .isInstanceOf(TokenVerificationException.class);
    }
}
