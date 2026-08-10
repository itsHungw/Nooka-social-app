package com.vinhung.nookaapi.auth.service;

import java.time.Clock;
import java.time.Duration;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LoginRateLimiter {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final String LOCKOUT_UNTIL_PREFIX = "auth:lockout-until:";
    private static final String FAILED_ATTEMPTS_PREFIX = "auth:failed-attempts:";
    private static final String LOCKOUT_LEVEL_PREFIX = "auth:lockout-level:";

    private final StringRedisTemplate redisTemplate;
    private final Clock clock;

    public long getRemainingLockoutSeconds(String email) {
        if (email == null || email.isBlank()) {
            return 0;
        }
        String key = LOCKOUT_UNTIL_PREFIX + normalize(email);
        String untilStr = redisTemplate.opsForValue().get(key);
        if (untilStr == null) {
            return 0;
        }
        try {
            long untilEpochMs = Long.parseLong(untilStr);
            long nowEpochMs = clock.millis();
            long remainingMs = untilEpochMs - nowEpochMs;
            if (remainingMs <= 0) {
                redisTemplate.delete(key);
                return 0;
            }
            return (remainingMs + 999) / 1000;
        } catch (NumberFormatException e) {
            redisTemplate.delete(key);
            return 0;
        }
    }

    public long recordFailedAttempt(String email) {
        if (email == null || email.isBlank()) {
            return 0;
        }
        String normalized = normalize(email);
        String attemptsKey = FAILED_ATTEMPTS_PREFIX + normalized;

        Long attemptsObj = redisTemplate.opsForValue().increment(attemptsKey);
        long attempts = (attemptsObj != null) ? attemptsObj : 1;
        redisTemplate.expire(attemptsKey, Duration.ofMinutes(15));

        if (attempts >= MAX_FAILED_ATTEMPTS) {
            String levelKey = LOCKOUT_LEVEL_PREFIX + normalized;
            Long levelObj = redisTemplate.opsForValue().increment(levelKey);
            long level = (levelObj != null) ? levelObj : 1;
            redisTemplate.expire(levelKey, Duration.ofDays(7));

            long durationSeconds = getLockoutDurationSeconds(level);
            long lockoutUntilEpochMs = clock.millis() + (durationSeconds * 1000);

            String lockoutKey = LOCKOUT_UNTIL_PREFIX + normalized;
            redisTemplate.opsForValue().set(lockoutKey, String.valueOf(lockoutUntilEpochMs), Duration.ofSeconds(durationSeconds));
            redisTemplate.delete(attemptsKey);

            return durationSeconds;
        }

        return 0;
    }

    public void resetOnSuccess(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        String normalized = normalize(email);
        redisTemplate.delete(FAILED_ATTEMPTS_PREFIX + normalized);
        redisTemplate.delete(LOCKOUT_UNTIL_PREFIX + normalized);
        redisTemplate.delete(LOCKOUT_LEVEL_PREFIX + normalized);
    }

    public long getLockoutDurationSeconds(long level) {
        if (level <= 1) {
            return 180; // 3 minutes
        }
        if (level == 2) {
            return 300; // 5 minutes
        }
        if (level == 3) {
            return 900; // 15 minutes
        }
        return 1800; // 30 minutes
    }

    private String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
