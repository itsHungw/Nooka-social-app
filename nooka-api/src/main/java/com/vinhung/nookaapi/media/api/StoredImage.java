package com.vinhung.nookaapi.media.api;

public record StoredImage(
        String storageKey,
        String contentType,
        long bytes,
        String checksum,
        int width,
        int height) {
}
