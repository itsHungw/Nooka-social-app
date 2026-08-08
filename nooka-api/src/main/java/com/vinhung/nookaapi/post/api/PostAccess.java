package com.vinhung.nookaapi.post.api;

import com.vinhung.nookaapi.shared.model.TagVote;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

/**
 * The only public read boundary for Post.
 *
 * <p>Cổng này bao gồm cả các phép <em>đếm</em>, không chỉ phép đọc. Một câu
 * {@code count(*) from posts} viết ra rất tự nhiên và rất dễ lọt qua review,
 * nhưng nó rò nội dung riêng tư qua con số — xem {@link #countVisibleAtSpot}.
 */
public interface PostAccess {
    Slice<PostCardView> feedFor(@Nullable UUID viewerId, Pageable pageable);

    Optional<PostDetailView> detail(UUID postId, @Nullable UUID viewerId);

    /**
     * Số người mà người xem đang follow, đã đăng bài tại địa điểm này và bài đó
     * người xem được phép xem (R3a). Khách chưa đăng nhập luôn nhận 0.
     *
     * <p>Đây là con số "3 người bạn đã tới đây", và là chỗ rò rỉ tinh vi nhất
     * của toàn bộ thiết kế: §8 chốt {@code Been} tự động bật khi user đăng bài,
     * kể cả bài {@code PRIVATE}. Nếu con số đó đếm thẳng bảng {@code been} thì
     * tôi đăng một bài riêng tư ở quán X, bạn tôi mở trang quán X và thấy số bạn
     * bè tăng từ 5 lên 6 — bài thì họ không đọc được, nhưng con số đã kể xong
     * câu chuyện.
     *
     * <p>Đếm theo <em>người</em>, không theo bài: một người đăng ba bài ở cùng
     * quán vẫn là một người.
     */
    long countFollowedAuthorsAtSpot(UUID spotId, @Nullable UUID viewerId);

    /**
     * Số bài tại một địa điểm ở mức chia sẻ rộng, không phụ thuộc người xem (R3b).
     *
     * <p>Đếm {@code PUBLIC} và {@code FOLLOWERS}; không bao giờ đếm
     * {@code CLOSE_FRIENDS} hay {@code PRIVATE} — §13 xếp hai tầng đó là giữ kín.
     *
     * <p>Cố ý không nhận {@code viewerId}: nếu con số này khác nhau theo từng
     * người thì nó không bao giờ cache được, và đường nâng cấp lên bảng thống kê
     * bị chặn ngay từ đầu.
     */
    long countSharedAtSpot(UUID spotId);

    /**
     * Thẻ do tác giả gắn lên bài tại một địa điểm, kèm người gắn.
     *
     * <p>Cùng luật tầng visibility với {@link #countSharedAtSpot}. Trả về từng
     * phiếu chứ không gộp sẵn, vì người gọi còn phải gộp với phiếu đến từ review
     * và phép gộp phải đếm theo <em>người</em>.
     */
    List<TagVote> tagVotesAtSpot(UUID spotId);
}
