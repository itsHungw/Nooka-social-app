package com.vinhung.nookaapi.post.service;

import com.vinhung.nookaapi.media.api.MediaService;
import com.vinhung.nookaapi.post.model.dto.MediaContent;
import com.vinhung.nookaapi.post.repository.PostMediaReader;
import com.vinhung.nookaapi.shared.error.ResourceNotFoundException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PostMediaService {

    private final PostMediaReader mediaReader;
    private final MediaService mediaService;

    public MediaContent read(
            UUID postPublicId, UUID mediaPublicId, @Nullable UUID viewerId) {
        PostMediaReader.ReadableMedia media = mediaReader
                .findVisible(postPublicId, mediaPublicId, viewerId)
                .orElseThrow(() -> new ResourceNotFoundException("Media is not available"));
        return new MediaContent(mediaService.read(media.storageKey()), media.contentType());
    }
}
