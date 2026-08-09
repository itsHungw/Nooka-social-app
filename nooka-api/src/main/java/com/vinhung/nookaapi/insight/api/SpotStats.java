package com.vinhung.nookaapi.insight.api;

import java.util.UUID;
import org.jspecify.annotations.Nullable;

/**
 * Cửa duy nhất để hỏi "địa điểm này có bao nhiêu…".
 *
 * <p><b>Vì sao module này tồn tại mà không sở hữu bảng nào.</b> Số check-in đếm
 * từ {@code post}, số review đếm từ {@code review}, số bạn bè phải ghép
 * {@code post} với {@code follows} của {@code user}. Ba module khác nhau. Nếu để
 * {@code spot} tự đi đếm thì {@code spot} phải đọc ngược lên {@code post} và tạo
 * ra một vòng phụ thuộc. {@code insight} nằm trên cả ba và chỉ đọc xuống.
 *
 * <p><b>Vì sao nó là interface chứ không phải một hàm tiện ích.</b> Bản đầu chỉ
 * là mấy câu đếm lúc đọc. Khi đo được chậm — và mục 11.2 của spec dự đoán xếp
 * hạng của "Hỏi Nooka" sẽ chạm trần trước tiên — ta thay ruột bằng bảng thống kê
 * cập nhật qua domain event, và <em>nơi gọi không đổi một dòng nào</em>. Giống
 * công tắc đèn: đổi nguồn điện thì công tắc vẫn thế.
 */
public interface SpotStats {

    /**
     * @param viewerId {@code null} cho khách chưa đăng nhập; khi đó
     *                 {@code friendCount} luôn là 0
     */
    SpotStatsView forViewer(UUID spotId, @Nullable UUID viewerId);
}
