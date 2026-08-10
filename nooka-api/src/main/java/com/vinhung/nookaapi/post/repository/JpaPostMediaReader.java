package com.vinhung.nookaapi.post.repository;

import com.vinhung.nookaapi.post.entity.Post;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
class JpaPostMediaReader implements PostMediaReader {

    private final PostRepository posts;
    private final PostVisibilityRules visibility;
    private final JdbcClient jdbc;

    @Override
    @Transactional(readOnly = true)
    public Optional<ReadableMedia> findVisible(
            UUID postPublicId, UUID mediaPublicId, @Nullable UUID viewerId) {
        Optional<Post> post = posts.findOne(visibility.visibleTo(viewerId).and(
                (root, query, builder) -> builder.equal(root.get("publicId"), postPublicId)));
        if (post.isEmpty()) {
            return Optional.empty();
        }
        return jdbc.sql("""
                select storage_key, content_type from post_media
                where post_id = :postId and public_id = :mediaId and status = 'READY'
                """)
                .param("postId", post.get().getId())
                .param("mediaId", mediaPublicId)
                .query((rs, rowNum) -> new ReadableMedia(
                        rs.getString("storage_key"), rs.getString("content_type")))
                .optional();
    }
}
