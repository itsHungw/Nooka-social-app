package com.vinhung.nookaapi.directions.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties("nooka.directions.cache")
public record RouteCacheProperties(
        @DefaultValue("true") boolean enabled,
        @DefaultValue("15m") Duration ttl,
        @DefaultValue("nooka:directions:route:v1") String keyPrefix,
        @DefaultValue("3") int originGridDecimals,
        @DefaultValue("5") int destinationGridDecimals) {

    public RouteCacheProperties {
        if (ttl == null || ttl.isZero() || ttl.isNegative()) {
            throw new IllegalArgumentException("Route cache TTL must be positive");
        }
        if (keyPrefix == null || keyPrefix.isBlank()) {
            throw new IllegalArgumentException("Route cache key prefix must not be blank");
        }
        if (originGridDecimals < 0 || originGridDecimals > 8) {
            throw new IllegalArgumentException("Origin grid decimals must be between 0 and 8");
        }
        if (destinationGridDecimals < 0 || destinationGridDecimals > 8) {
            throw new IllegalArgumentException("Destination grid decimals must be between 0 and 8");
        }

        keyPrefix = keyPrefix.trim().replaceAll(":+$", "");
    }
}