package com.vinhung.nookaapi.post.repository;

import com.vinhung.nookaapi.post.entity.Post;
import com.vinhung.nookaapi.shared.model.Visibility;
import com.vinhung.nookaapi.user.query.RelationshipCriteria;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class PostVisibilityRules {

    private final RelationshipCriteria relationships;

    Specification<Post> visibleTo(@Nullable UUID viewerId) {
        return (root, query, builder) -> {
            Predicate notDeleted = builder.isNull(root.get("deletedAt"));
            Path<UUID> authorId = root.get("authorId");

            if (viewerId == null) {
                return builder.and(notDeleted, isPublic(root, builder));
            }

            Predicate audience = builder.or(
                    builder.equal(authorId, viewerId),
                    isPublic(root, builder),
                    builder.and(
                            builder.equal(root.get("visibility"), Visibility.FOLLOWERS),
                            builder.exists(relationships.followExists(
                                    query, builder, viewerId, authorId))),
                    builder.and(
                            builder.equal(root.get("visibility"), Visibility.CLOSE_FRIENDS),
                            builder.exists(relationships.closeFriendExists(
                                    query, builder, viewerId, authorId))));

            return builder.and(notDeleted, audience,
                    builder.not(builder.exists(relationships.blockExists(
                            query, builder, viewerId, authorId))));
        };
    }

    private static Predicate isPublic(Root<Post> root, CriteriaBuilder builder) {
        return builder.equal(root.get("visibility"), Visibility.PUBLIC);
    }
}
