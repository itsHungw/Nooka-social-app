package com.vinhung.nookaapi.auth.integration;

import com.vinhung.nookaapi.auth.repository.AuthSessionRepository;
import com.vinhung.nookaapi.auth.service.AuthTokenSupport;
import com.vinhung.nookaapi.user.spi.TokenVerificationException;
import com.vinhung.nookaapi.user.spi.TokenVerifier;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class AuthTokenVerifier implements TokenVerifier {

    private final AuthSessionRepository sessions;
    private final AuthTokenSupport tokenSupport;
    private final Clock clock;

    @Override
    public UUID verify(String token) {
        if (token == null || token.isBlank()) {
            throw new TokenVerificationException(new IllegalArgumentException("Token is blank"));
        }
        return sessions.findByAccessTokenHash(tokenSupport.hash(token))
                .filter(session -> session.isAccessValidAt(Instant.now(clock)))
                .map(session -> session.getUser().getId())
                .orElseThrow(() -> new TokenVerificationException(new IllegalArgumentException("Token is invalid")));
    }
}
