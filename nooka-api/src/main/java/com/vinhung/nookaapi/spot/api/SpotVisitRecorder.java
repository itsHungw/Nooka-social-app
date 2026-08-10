package com.vinhung.nookaapi.spot.api;

import java.util.UUID;

/** Idempotent Spot-owned projection updated after a Post commits. */
public interface SpotVisitRecorder {
    void recordBeen(UUID userId, UUID spotId, UUID firstPostId);
}
