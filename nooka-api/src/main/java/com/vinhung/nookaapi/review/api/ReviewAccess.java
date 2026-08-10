package com.vinhung.nookaapi.review.api;

import com.vinhung.nookaapi.shared.model.TagVote;
import java.util.List;
import java.util.UUID;

/**
 * Cổng đọc review cho module khác.
 *
 * <p>Khác {@code PostAccess}, cổng này không phải ép luật riêng tư: review là
 * đóng góp công khai cho một địa điểm, giống một dòng trên trang quán. Nó tồn
 * tại để {@code insight} không phải chạm bảng của module {@code review}, và để
 * việc thêm luật lọc về sau chỉ phải sửa một chỗ.
 */
public interface ReviewAccess {

    /** Số review chưa xoá tại một địa điểm. */
    long countAtSpot(UUID spotId);

    /**
     * Thẻ sinh ra từ câu trả lời review tại một địa điểm, kèm người trả lời.
     *
     * <p>Trả về từng phiếu chứ không gộp sẵn: người gọi còn phải gộp với phiếu
     * đến từ bài viết, và việc gộp phải đếm theo <em>người</em> chứ không cộng
     * hai con số lại.
     */
    List<TagVote> tagVotesAtSpot(UUID spotId);
}
