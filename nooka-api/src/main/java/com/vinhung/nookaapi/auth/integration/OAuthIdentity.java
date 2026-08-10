package com.vinhung.nookaapi.auth.integration;

public record OAuthIdentity(String subject, String email, boolean emailVerified, String displayName) {
}
