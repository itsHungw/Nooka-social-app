package com.vinhung.nookaapi.post.model.dto;

import java.util.List;
import java.util.UUID;

public record CreateCheckInResponse(
        UUID publicId,
        UUID spotId,
        String visibility,
        boolean visitTimeVisible,
        String beenStatus,
        boolean wantToGoPresent,
        List<UUID> audienceUserIds,
        List<PostMediaResponse> media) {
}
