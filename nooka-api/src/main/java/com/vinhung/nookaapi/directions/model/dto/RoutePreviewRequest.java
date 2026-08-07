package com.vinhung.nookaapi.directions.model.dto;

import com.vinhung.nookaapi.directions.model.enums.TravelMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record RoutePreviewRequest(
        @Valid @NotNull Coordinate origin,
        @Valid @NotNull Coordinate destination,
        @NotNull TravelMode mode) {

    public record Coordinate(
            @DecimalMin("-90.0") @DecimalMax("90.0") double latitude,
            @DecimalMin("-180.0") @DecimalMax("180.0") double longitude) {
    }
}
