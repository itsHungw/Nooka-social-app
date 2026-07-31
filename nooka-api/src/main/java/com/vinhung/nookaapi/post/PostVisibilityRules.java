package com.vinhung.nookaapi.post;

import com.vinhung.nookaapi.user.Block;
import com.vinhung.nookaapi.user.CloseFriend;
import com.vinhung.nookaapi.user.Follow;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.data.jpa.domain.Specification;

/**
 * Luật hiển thị ở §13, diễn đạt thành một predicate SQL duy nhất.
 *
 * <p>Đây là nơi duy nhất trong dự án được quyền quyết định ai xem được bài nào.
 * Không sao chép logic này đi chỗ khác: hai bản sao sẽ lệch nhau, và bản lệch
 * sẽ là bản để lộ dữ liệu.
 *
 * <p>Ba điều dễ làm sai, đã khóa bằng test:
 * <ul>
 *   <li>{@code CLOSE_FRIENDS} không phải tập con của {@code FOLLOWERS}. Một
 *       close friend có thể chưa từng bấm follow, và một follower thường không
 *       được xem bài close friends.
 *   <li>Danh sách close friends là <b>một chiều</b>. Chỉ danh sách của tác giả
 *       mới mở được bài của tác giả.
 *   <li>Chặn được lưu một chiều nhưng phải đọc <b>hai chiều</b>, và nó thắng cả
 *       {@code PUBLIC}.
 * </ul>
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class PostVisibilityRules {

    /**
     * @param viewerId user đang xem, hoặc {@code null} nếu chưa đăng nhập
     */
    public static Specification<Post> visibleTo(@Nullable UUID viewerId) {
        return (root, query, cb) -> {
            Predicate notDeleted = cb.isNull(root.get("deletedAt"));
            Path<UUID> authorId = root.get("author").get("id");

            // Khách chưa đăng nhập chỉ thấy Public. Không có ai để so quan hệ,
            // và cũng không có lệnh chặn nào áp dụng được.
            if (viewerId == null) {
                return cb.and(notDeleted, isPublic(root, cb));
            }

            Predicate audience = cb.or(
                    // Tác giả luôn thấy bài của mình, ở mọi mức — đây cũng là
                    // đường duy nhất mở được bài PRIVATE.
                    cb.equal(authorId, viewerId),
                    isPublic(root, cb),
                    cb.and(
                            cb.equal(root.get("visibility"), Visibility.FOLLOWERS),
                            cb.exists(followExists(query, cb, viewerId, authorId))),
                    cb.and(
                            cb.equal(root.get("visibility"), Visibility.CLOSE_FRIENDS),
                            cb.exists(closeFriendExists(query, cb, viewerId, authorId))));

            return cb.and(notDeleted, audience,
                    cb.not(cb.exists(blockExists(query, cb, viewerId, authorId))));
        };
    }

    private static Predicate isPublic(Root<Post> root, CriteriaBuilder cb) {
        return cb.equal(root.get("visibility"), Visibility.PUBLIC);
    }

    /** Người xem có đang follow tác giả không. Chiều rất quan trọng. */
    private static Subquery<Integer> followExists(
            CriteriaQuery<?> query, CriteriaBuilder cb, UUID viewerId, Path<UUID> authorId) {
        Subquery<Integer> sub = query.subquery(Integer.class);
        Root<Follow> follow = sub.from(Follow.class);
        return sub.select(cb.literal(1))
                .where(cb.equal(follow.get("followerId"), viewerId),
                        cb.equal(follow.get("followeeId"), authorId));
    }

    /**
     * Người xem có nằm trong danh sách close friends <b>của tác giả</b> không.
     * Danh sách của người xem không liên quan.
     */
    private static Subquery<Integer> closeFriendExists(
            CriteriaQuery<?> query, CriteriaBuilder cb, UUID viewerId, Path<UUID> authorId) {
        Subquery<Integer> sub = query.subquery(Integer.class);
        Root<CloseFriend> closeFriend = sub.from(CloseFriend.class);
        return sub.select(cb.literal(1))
                .where(cb.equal(closeFriend.get("ownerId"), authorId),
                        cb.equal(closeFriend.get("friendId"), viewerId));
    }

    /**
     * Có lệnh chặn nào giữa hai người không, bất kể ai chặn ai.
     *
     * <p>Nếu chỉ kiểm tra chiều "người xem chặn tác giả" thì người bị chặn vẫn
     * đọc được bài của người đã chặn mình — tức là chặn không có tác dụng với
     * đúng người mà nó sinh ra để ngăn.
     */
    private static Subquery<Integer> blockExists(
            CriteriaQuery<?> query, CriteriaBuilder cb, UUID viewerId, Path<UUID> authorId) {
        Subquery<Integer> sub = query.subquery(Integer.class);
        Root<Block> block = sub.from(Block.class);
        return sub.select(cb.literal(1))
                .where(cb.or(
                        cb.and(cb.equal(block.get("blockerId"), viewerId),
                                cb.equal(block.get("blockedId"), authorId)),
                        cb.and(cb.equal(block.get("blockerId"), authorId),
                                cb.equal(block.get("blockedId"), viewerId))));
    }
}
