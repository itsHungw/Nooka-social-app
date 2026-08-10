package com.vinhung.nookaapi.spot.api;

import java.util.Optional;
import java.util.UUID;

/** Approved/canonical Spot lookup for cross-module check-in writes. */
public interface SpotAccess {
    Optional<CheckInSpot> resolveForCheckIn(UUID spotId, UUID userId);
}
