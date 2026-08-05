package com.vinhung.nookaapi.user.query;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Subquery;
import java.util.UUID;

/** SQL fragments used by Post visibility without exposing user entities. */
public interface RelationshipCriteria {
    Subquery<Integer> followExists(CriteriaQuery<?> query, CriteriaBuilder builder,
            UUID viewerId, Path<UUID> authorId);

    Subquery<Integer> closeFriendExists(CriteriaQuery<?> query, CriteriaBuilder builder,
            UUID viewerId, Path<UUID> authorId);

    Subquery<Integer> blockExists(CriteriaQuery<?> query, CriteriaBuilder builder,
            UUID viewerId, Path<UUID> authorId);
}
