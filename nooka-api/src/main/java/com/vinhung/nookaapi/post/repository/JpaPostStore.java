package com.vinhung.nookaapi.post.repository;

import com.vinhung.nookaapi.media.api.StoredImage;
import com.vinhung.nookaapi.post.entity.Post;
import com.vinhung.nookaapi.post.model.dto.MediaCropRequest;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class JpaPostStore implements PostStore {

    private final PostRepository repository;
    private final EntityManager entityManager;
    private final JdbcClient jdbc;

    @Override
    public Optional<Post> findIdempotent(UUID authorId, UUID idempotencyKey) {
        return repository.findByAuthorIdAndIdempotencyKey(authorId, idempotencyKey);
    }

    @Override
    public Post saveAndRefresh(Post post) {
        Post saved = repository.saveAndFlush(post);
        entityManager.refresh(saved);
        return saved;
    }

    @Override
    public List<StoredMedia> insertMedia(
            Post post, List<StoredImage> media, List<MediaCropRequest> crops) {
        List<StoredMedia> rows = new ArrayList<>(media.size());
        for (int position = 0; position < media.size(); position++) {
            StoredImage image = media.get(position);
            MediaCropRequest crop = crops.get(position);
            UUID publicId = UUID.randomUUID();
            jdbc.sql("""
                    insert into post_media
                        (post_id, public_id, position, width, height, status, storage_key,
                         content_type, bytes, checksum, crop_zoom, crop_offset_x, crop_offset_y)
                    values
                        (:postId, :publicId, :position, :width, :height, 'READY', :storageKey,
                         :contentType, :bytes, :checksum, :cropZoom, :cropOffsetX, :cropOffsetY)
                    """)
                    .param("postId", post.getId())
                    .param("publicId", publicId)
                    .param("position", position)
                    .param("width", image.width())
                    .param("height", image.height())
                    .param("storageKey", image.storageKey())
                    .param("contentType", image.contentType())
                    .param("bytes", image.bytes())
                    .param("checksum", image.checksum())
                    .param("cropZoom", crop.zoom())
                    .param("cropOffsetX", crop.offsetX())
                    .param("cropOffsetY", crop.offsetY())
                    .update();
            rows.add(new StoredMedia(
                    publicId, image.width(), image.height(), position,
                    crop.zoom(), crop.offsetX(), crop.offsetY()));
        }
        return List.copyOf(rows);
    }

    @Override
    public List<StoredMedia> mediaFor(UUID postId) {
        return jdbc.sql("""
                select public_id, width, height, position,
                       crop_zoom, crop_offset_x, crop_offset_y
                from post_media where post_id = :postId order by position
                """)
                .param("postId", postId)
                .query((rs, rowNum) -> new StoredMedia(
                        rs.getObject("public_id", UUID.class),
                        rs.getInt("width"), rs.getInt("height"), rs.getInt("position"),
                        rs.getDouble("crop_zoom"), rs.getDouble("crop_offset_x"),
                        rs.getDouble("crop_offset_y")))
                .list();
    }

    @Override
    public void insertHashtags(UUID postId, List<Hashtag> hashtags) {
        for (int position = 0; position < hashtags.size(); position++) {
            Hashtag hashtag = hashtags.get(position);
            jdbc.sql("""
                    insert into post_hashtags(post_id, display_text, normalized_key, position)
                    values (:postId, :displayText, :normalizedKey, :position)
                    """)
                    .param("postId", postId)
                    .param("displayText", hashtag.displayText())
                    .param("normalizedKey", hashtag.normalizedKey())
                    .param("position", position)
                    .update();
        }
    }

    @Override
    public void insertAudience(UUID postId, List<UUID> audienceUserIds) {
        for (UUID viewerId : audienceUserIds) {
            jdbc.sql("""
                    insert into post_audience(post_id, viewer_id)
                    values (:postId, :viewerId)
                    """)
                    .param("postId", postId)
                    .param("viewerId", viewerId)
                    .update();
        }
    }

    @Override
    public List<UUID> audienceFor(UUID postId) {
        return jdbc.sql("""
                select viewer_id from post_audience
                where post_id = :postId order by created_at, viewer_id
                """)
                .param("postId", postId)
                .query(UUID.class)
                .list();
    }
}
