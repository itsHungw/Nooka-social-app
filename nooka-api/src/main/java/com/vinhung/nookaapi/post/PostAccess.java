package com.vinhung.nookaapi.post;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cửa duy nhất để đọc Post.
 *
 * <p>R2 ở §20: Spring Boot không có Row Level Security, nên luật hiển thị phải
 * được ép trong mọi truy vấn chạm tới Post. Mọi phương thức ở đây bắt buộc nhận
 * {@code viewerId} và tự ghép {@link PostVisibilityRules#visibleTo} vào query —
 * không có biến thể nào bỏ qua được, vì {@code PostRepository} là
 * package-private.
 *
 * <p>Thêm phương thức mới vào đây thì phải bắt đầu bằng {@code visibleTo(...)}
 * rồi mới {@code and(...)} thêm điều kiện. Đừng bao giờ gọi thẳng repository.
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostAccess {

    private final PostRepository repository;

    /**
     * @param viewerId user đang xem, hoặc {@code null} nếu chưa đăng nhập
     */
    public List<Post> findVisibleTo(@Nullable UUID viewerId) {
        return repository.findAll(PostVisibilityRules.visibleTo(viewerId));
    }

    /**
     * Một bài cụ thể, chỉ khi người xem có quyền.
     *
     * <p>Trả về rỗng khi bài không tồn tại và cũng khi bài tồn tại nhưng bị
     * cấm xem — cố ý không phân biệt hai trường hợp, vì phân biệt được tức là
     * để lộ sự tồn tại của bài riêng tư.
     */
    public Optional<Post> findByIdVisibleTo(UUID postId, @Nullable UUID viewerId) {
        return repository.findOne(
                PostVisibilityRules.visibleTo(viewerId).and(hasId(postId)));
    }

    /** Feed: bài mới nhất trước, đã lọc theo quyền xem. */
    public Page<Post> findFeedFor(@Nullable UUID viewerId, Pageable pageable) {
        return repository.findAll(PostVisibilityRules.visibleTo(viewerId), pageable);
    }

    private static Specification<Post> hasId(UUID postId) {
        return (root, query, cb) -> cb.equal(root.get("id"), postId);
    }
}
