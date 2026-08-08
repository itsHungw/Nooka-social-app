package com.vinhung.nookaapi.auth.integration;

import com.vinhung.nookaapi.auth.model.enums.OAuthProvider;
import com.vinhung.nookaapi.shared.error.AuthException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

@Component
class AppleIdentityVerifier implements OAuthIdentityVerifier {

    private final JwtDecoder decoder;

    AppleIdentityVerifier(@Qualifier("appleJwtDecoder") JwtDecoder decoder) {
        this.decoder = decoder;
    }

    @Override
    public OAuthProvider provider() {
        return OAuthProvider.APPLE;
    }

    @Override
    public OAuthIdentity verify(String token) {
        try {
            Jwt jwt = decoder.decode(token);
            String email = jwt.getClaimAsString("email");
            Object verifiedClaim = jwt.getClaims().get("email_verified");
            boolean verified = Boolean.TRUE.equals(verifiedClaim) || "true".equalsIgnoreCase(String.valueOf(verifiedClaim));
            return new OAuthIdentity(jwt.getSubject(), email, verified,
                    jwt.getClaimAsString("name"));
        } catch (JwtException | IllegalArgumentException exception) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Apple authentication failed");
        }
    }
}
