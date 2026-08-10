package com.vinhung.nookaapi.post.repository;

import com.vinhung.nookaapi.media.api.StoredImage;
import com.vinhung.nookaapi.post.entity.Post;
import com.vinhung.nookaapi.post.model.dto.MediaCropRequest;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PostStore {
    Optional<Post> findIdempotent(UUID authorId, UUID idempotencyKey);

    Post saveAndRefresh(Post post);

    List<StoredMedia> insertMedia(
            Post post, List<StoredImage> media, List<MediaCropRequest> crops);

    List<StoredMedia> mediaFor(UUID postId);

    void insertHashtags(UUID postId, List<Hashtag> hashtags);

    void insertAudience(UUID postId, List<UUID> audienceUserIds);

    List<UUID> audienceFor(UUID postId);

    record StoredMedia(
            UUID publicId,
            int width,
            int height,
            int position,
            double cropZoom,
            double cropOffsetX,
            double cropOffsetY) {
    }

    record Hashtag(String displayText, String normalizedKey) {
    }
}
