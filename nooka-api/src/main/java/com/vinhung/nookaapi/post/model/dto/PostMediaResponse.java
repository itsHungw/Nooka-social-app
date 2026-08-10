package com.vinhung.nookaapi.post.model.dto;

import java.util.UUID;

public record PostMediaResponse(
        UUID id,
        String url,
        int width,
        int height,
        int position,
        double cropZoom,
        double cropOffsetX,
        double cropOffsetY) {
}
