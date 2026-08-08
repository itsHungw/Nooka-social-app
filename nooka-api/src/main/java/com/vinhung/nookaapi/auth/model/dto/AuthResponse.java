package com.vinhung.nookaapi.auth.model.dto;

import java.time.Instant;

public record AuthResponse(String accessToken, String refreshToken, Instant accessTokenExpiresAt,
        Instant refreshTokenExpiresAt, UserResponse user) {
}
