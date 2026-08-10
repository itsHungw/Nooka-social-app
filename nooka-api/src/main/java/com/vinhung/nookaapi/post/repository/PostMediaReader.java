package com.vinhung.nookaapi.post.repository;

import java.util.Optional;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

public interface PostMediaReader {
    Optional<ReadableMedia> findVisible(
            UUID postPublicId, UUID mediaPublicId, @Nullable UUID viewerId);

    record ReadableMedia(String storageKey, String contentType) {
    }
}
