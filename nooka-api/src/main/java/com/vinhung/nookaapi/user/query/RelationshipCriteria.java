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

    Subquery<Integer> mutualFollowExists(CriteriaQuery<?> query, CriteriaBuilder builder,
            UUID viewerId, Path<UUID> authorId);

    Subquery<Integer> closeFriendExists(CriteriaQuery<?> query, CriteriaBuilder builder,
            UUID viewerId, Path<UUID> authorId);

    Subquery<Integer> privateAuthorExists(CriteriaQuery<?> query, CriteriaBuilder builder,
            Path<UUID> authorId);

    Subquery<Integer> blockExists(CriteriaQuery<?> query, CriteriaBuilder builder,
            UUID viewerId, Path<UUID> authorId);

    /**
     * Tác giả có đang bị đánh dấu xoá tài khoản không (R9).
     *
     * <p>Không nhận {@code viewerId}: trạng thái xoá của một tài khoản giống
     * nhau với mọi người xem, kể cả khách chưa đăng nhập.
     *
     * <p>Trả về subquery thay vì boolean vì phép kiểm phải nằm trong cùng một
     * câu SQL với phép lọc Post. Lọc ở tầng Java thì phải nạp bài về trước rồi
     * mới loại, và số lượng của mỗi trang sẽ sai.
     */
    Subquery<Integer> deletedAuthorExists(CriteriaQuery<?> query, CriteriaBuilder builder,
            Path<UUID> authorId);
}
