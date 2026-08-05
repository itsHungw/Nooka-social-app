package com.vinhung.nookaapi.post.api;

import java.util.Optional;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

/** The only public read boundary for Post. */
public interface PostAccess {
    Slice<PostCardView> feedFor(@Nullable UUID viewerId, Pageable pageable);

    Optional<PostDetailView> detail(UUID postId, @Nullable UUID viewerId);
}
