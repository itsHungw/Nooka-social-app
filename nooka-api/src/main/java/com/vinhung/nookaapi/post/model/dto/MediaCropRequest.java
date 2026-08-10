package com.vinhung.nookaapi.post.model.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record MediaCropRequest(
        @NotNull @DecimalMin("1.0") @DecimalMax("3.0") Double zoom,
        @NotNull @DecimalMin("-1.0") @DecimalMax("1.0") Double offsetX,
        @NotNull @DecimalMin("-1.0") @DecimalMax("1.0") Double offsetY) {

    public static MediaCropRequest centered() {
        return new MediaCropRequest(1.0, 0.0, 0.0);
    }
}
