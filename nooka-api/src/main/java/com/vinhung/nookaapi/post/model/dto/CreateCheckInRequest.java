package com.vinhung.nookaapi.post.model.dto;

import com.vinhung.nookaapi.shared.model.Visibility;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record CreateCheckInRequest(
        @NotNull UUID spotId,
        @NotNull Visibility visibility,
        @Size(max = 2000) String caption,
        @Size(max = 500) String oneThingToKnow,
        @Size(max = 100) String occasion,
        @Positive @Max(100) Integer partySize,
        Boolean wouldReturn,
        Boolean hideTime,
        @Size(max = 10) List<@Size(min = 1, max = 64) String> hashtags,
        @Size(max = 50) List<UUID> audienceUserIds,
        @Size(max = 5) List<@Valid MediaCropRequest> media) {
}
