package com.vinhung.nookaapi.post.repository;

import com.vinhung.nookaapi.post.api.PostAccess;
import com.vinhung.nookaapi.post.api.PostCardView;
import com.vinhung.nookaapi.post.api.PostDetailView;
import com.vinhung.nookaapi.post.entity.Post;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
class JpaPostAccess implements PostAccess {

    private final PostRepository repository;
    private final PostVisibilityRules visibilityRules;

    @Override
    public Slice<PostCardView> feedFor(@Nullable UUID viewerId, Pageable pageable) {
        return repository.findAll(visibilityRules.visibleTo(viewerId), pageable)
                .map(post -> new PostCardView(post.getId()));
    }

    @Override
    public Optional<PostDetailView> detail(UUID postId, @Nullable UUID viewerId) {
        return repository.findOne(visibilityRules.visibleTo(viewerId).and(hasId(postId)))
                .map(post -> new PostDetailView(post.getId()));
    }

    private static Specification<Post> hasId(UUID postId) {
        return (root, query, builder) -> builder.equal(root.get("id"), postId);
    }
}
