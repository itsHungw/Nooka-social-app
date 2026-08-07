package com.vinhung.nookaapi.directions.cache;

import com.vinhung.nookaapi.directions.model.enums.TravelMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

public record RoutePreviewCacheKey(
        String providerId,
        TravelMode mode,
        long originLatitudeBucket,
        long originLongitudeBucket,
        long destinationLatitudeBucket,
        long destinationLongitudeBucket) {

    public String redisKey(String keyPrefix) {
        return keyPrefix + ":" + sha256(canonicalValue());
    }

    private String canonicalValue() {
        return String.join(
                "|",
                providerId,
                mode.name(),
                Long.toString(originLatitudeBucket),
                Long.toString(originLongitudeBucket),
                Long.toString(destinationLatitudeBucket),
                Long.toString(destinationLongitudeBucket));
    }

    private static String sha256(String value) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}