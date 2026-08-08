package com.vinhung.nookaapi.spot.api;

import java.math.BigDecimal;
import java.util.List;

/**
 * Cổng chống trùng place, yêu cầu của §7:
 * "cần cơ chế chống trùng place ngay từ đầu (so tên + tọa độ trong bán kính,
 * gợi ý merge)".
 *
 * <p>Đặt ở {@code api} và cài đặt package-private trong {@code repository},
 * cùng khuôn với {@code post.api.PostAccess}: nơi gọi chỉ thấy interface, nên
 * đổi cách so trùng về sau không lan ra ngoài module.
 */
public interface SpotDuplicateFinder {

    /**
     * Tìm địa điểm chưa bị gộp, nằm trong bán kính và có tên đủ giống.
     *
     * <p>Hai điều kiện phải cùng đúng. Chỉ so tên thì hai chi nhánh của một
     * chuỗi cách nhau 5km bị coi là trùng; chỉ so toạ độ thì quán cà phê cạnh
     * tiệm bánh mì bị coi là trùng.
     *
     * @param name          tên người dùng vừa gõ
     * @param latitude      vĩ độ điểm mới
     * @param longitude     kinh độ điểm mới
     * @param radiusMeters  bán kính tính bằng mét; 150 là giá trị dùng ở luồng tạo spot
     * @param minSimilarity ngưỡng giống tên 0..1; 0.3 là giá trị dùng ở luồng tạo spot
     * @return danh sách ứng viên, gần nhất trước; rỗng nếu không có
     */
    List<DuplicateSpotCandidate> findNear(
            String name,
            BigDecimal latitude,
            BigDecimal longitude,
            double radiusMeters,
            double minSimilarity);
}
