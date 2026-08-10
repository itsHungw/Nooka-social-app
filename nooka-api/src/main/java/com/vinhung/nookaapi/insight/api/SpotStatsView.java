package com.vinhung.nookaapi.insight.api;

import java.util.List;

/**
 * Mọi con số trang địa điểm cần, tính cho một người xem cụ thể.
 *
 * <p>Không có cột nào trong database tương ứng với record này — tất cả đếm lúc
 * đọc. Đó là quyết định ở mục 4.3 của spec: cột counter là hướng khó rút lui
 * nhất, và ở quy mô 2–3 quận mà §11 khoá thì nó không nhanh hơn đáng kể.
 *
 * @param checkinCount số bài ở mức chia sẻ rộng tại địa điểm (R3b, toàn cục)
 * @param reviewCount  số review chưa xoá
 * @param friendCount  số người mình follow đã tới đây (R3a, khác nhau theo người xem)
 * @param isNew        chưa ai hoặc mới một người check-in
 * @param hasReview    đã có ít nhất một review
 * @param tags         thẻ của địa điểm, nhiều người nói nhất trước
 */
public record SpotStatsView(
        long checkinCount,
        long reviewCount,
        long friendCount,
        boolean isNew,
        boolean hasReview,
        List<TagStat> tags) {
}
