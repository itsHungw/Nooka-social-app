package com.vinhung.nookaapi.auth.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("nooka.auth")
public record AuthProperties(
        Duration accessTokenTtl,
        Duration refreshTokenTtl,
        Duration verificationCodeTtl,
        Duration resetCodeTtl,
        int maxCodeAttempts,
        Email email) {

    public record Email(boolean enabled, String host, int port, String username, String password, String from) {
    }
}
