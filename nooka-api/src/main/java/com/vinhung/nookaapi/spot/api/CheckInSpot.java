package com.vinhung.nookaapi.spot.api;

import java.util.UUID;

public record CheckInSpot(UUID spotId, UUID inspiredByPostId, boolean wantToGoPresent) {
}
