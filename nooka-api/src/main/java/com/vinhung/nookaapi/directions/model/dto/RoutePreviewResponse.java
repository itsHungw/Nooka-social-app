package com.vinhung.nookaapi.directions.model.dto;

import com.vinhung.nookaapi.directions.model.enums.TravelMode;

public record RoutePreviewResponse(
        long distanceMeters,
        long durationSeconds,
        String encodedPolyline,
        TravelMode mode) {
}
