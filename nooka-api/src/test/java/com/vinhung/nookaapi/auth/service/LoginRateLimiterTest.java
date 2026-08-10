package com.vinhung.nookaapi.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

class LoginRateLimiterTest {

    private StringRedisTemplate redisTemplate;
    private ValueOperations<String, String> valueOps;
    private Clock clock;
    private LoginRateLimiter rateLimiter;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        valueOps = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        clock = Clock.fixed(Instant.parse("2026-08-10T12:00:00Z"), ZoneId.of("UTC"));
        rateLimiter = new LoginRateLimiter(redisTemplate, clock);
    }

    @Test
    void returnsRemainingLockoutSecondsWhenLocked() {
        String email = "test@example.com";
        long lockoutUntil = clock.millis() + 120_000;
        when(valueOps.get("auth:lockout-until:test@example.com")).thenReturn(String.valueOf(lockoutUntil));

        long remaining = rateLimiter.getRemainingLockoutSeconds(email);

        assertEquals(120, remaining);
    }

    @Test
    void returnsZeroWhenLockoutExpired() {
        String email = "test@example.com";
        long lockoutUntil = clock.millis() - 5000;
        when(valueOps.get("auth:lockout-until:test@example.com")).thenReturn(String.valueOf(lockoutUntil));

        long remaining = rateLimiter.getRemainingLockoutSeconds(email);

        assertEquals(0, remaining);
        verify(redisTemplate).delete("auth:lockout-until:test@example.com");
    }

    @Test
    void progressiveLockoutDurations() {
        assertEquals(180, rateLimiter.getLockoutDurationSeconds(1));
        assertEquals(300, rateLimiter.getLockoutDurationSeconds(2));
        assertEquals(900, rateLimiter.getLockoutDurationSeconds(3));
        assertEquals(1800, rateLimiter.getLockoutDurationSeconds(4));
    }

    @Test
    void recordFailedAttemptTriggersLockoutOnFifthAttempt() {
        String email = "user@example.com";
        when(valueOps.increment("auth:failed-attempts:user@example.com")).thenReturn(5L);
        when(valueOps.increment("auth:lockout-level:user@example.com")).thenReturn(1L);

        long duration = rateLimiter.recordFailedAttempt(email);

        assertEquals(180, duration);
        verify(valueOps).set(eq("auth:lockout-until:user@example.com"), any(String.class), any(java.time.Duration.class));
        verify(redisTemplate).delete("auth:failed-attempts:user@example.com");
    }

    @Test
    void resetOnSuccessClearsAllKeys() {
        String email = "user@example.com";
        rateLimiter.resetOnSuccess(email);

        verify(redisTemplate).delete("auth:failed-attempts:user@example.com");
        verify(redisTemplate).delete("auth:lockout-until:user@example.com");
        verify(redisTemplate).delete("auth:lockout-level:user@example.com");
    }
}
