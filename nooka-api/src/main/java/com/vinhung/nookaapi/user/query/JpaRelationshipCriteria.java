package com.vinhung.nookaapi.user.query;

import com.vinhung.nookaapi.user.entity.Block;
import com.vinhung.nookaapi.user.entity.CloseFriend;
import com.vinhung.nookaapi.user.entity.Follow;
import com.vinhung.nookaapi.user.entity.User;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
class JpaRelationshipCriteria implements RelationshipCriteria {

    @Override
    public Subquery<Integer> followExists(CriteriaQuery<?> query, CriteriaBuilder builder,
            UUID viewerId, Path<UUID> authorId) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<Follow> follow = subquery.from(Follow.class);
        return subquery.select(builder.literal(1))
                .where(builder.equal(follow.get("followerId"), viewerId),
                        builder.equal(follow.get("followeeId"), authorId));
    }

    @Override
    public Subquery<Integer> mutualFollowExists(CriteriaQuery<?> query,
            CriteriaBuilder builder, UUID viewerId, Path<UUID> authorId) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<Follow> viewerFollowsAuthor = subquery.from(Follow.class);
        Root<Follow> authorFollowsViewer = subquery.from(Follow.class);
        return subquery.select(builder.literal(1))
                .where(builder.equal(viewerFollowsAuthor.get("followerId"), viewerId),
                        builder.equal(viewerFollowsAuthor.get("followeeId"), authorId),
                        builder.equal(authorFollowsViewer.get("followerId"), authorId),
                        builder.equal(authorFollowsViewer.get("followeeId"), viewerId));
    }

    @Override
    public Subquery<Integer> closeFriendExists(CriteriaQuery<?> query, CriteriaBuilder builder,
            UUID viewerId, Path<UUID> authorId) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<CloseFriend> closeFriend = subquery.from(CloseFriend.class);
        Root<Follow> viewerFollowsAuthor = subquery.from(Follow.class);
        Root<Follow> authorFollowsViewer = subquery.from(Follow.class);
        return subquery.select(builder.literal(1))
                .where(builder.equal(closeFriend.get("ownerId"), authorId),
                        builder.equal(closeFriend.get("friendId"), viewerId),
                        builder.equal(viewerFollowsAuthor.get("followerId"), viewerId),
                        builder.equal(viewerFollowsAuthor.get("followeeId"), authorId),
                        builder.equal(authorFollowsViewer.get("followerId"), authorId),
                        builder.equal(authorFollowsViewer.get("followeeId"), viewerId));
    }

    @Override
    public Subquery<Integer> privateAuthorExists(CriteriaQuery<?> query, CriteriaBuilder builder,
            Path<UUID> authorId) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<User> user = subquery.from(User.class);
        return subquery.select(builder.literal(1))
                .where(builder.equal(user.get("id"), authorId),
                        builder.isTrue(user.get("privateProfile")));
    }

    @Override
    public Subquery<Integer> blockExists(CriteriaQuery<?> query, CriteriaBuilder builder,
            UUID viewerId, Path<UUID> authorId) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<Block> block = subquery.from(Block.class);
        return subquery.select(builder.literal(1))
                .where(builder.or(
                        builder.and(builder.equal(block.get("blockerId"), viewerId),
                                builder.equal(block.get("blockedId"), authorId)),
                        builder.and(builder.equal(block.get("blockerId"), authorId),
                                builder.equal(block.get("blockedId"), viewerId))));
    }

    @Override
    public Subquery<Integer> deletedAuthorExists(CriteriaQuery<?> query, CriteriaBuilder builder,
            Path<UUID> authorId) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<User> user = subquery.from(User.class);
        return subquery.select(builder.literal(1))
                .where(builder.equal(user.get("id"), authorId),
                        builder.isNotNull(user.get("deletedAt")));
    }
}
