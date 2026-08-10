package com.vinhung.nookaapi.spot.api;

import java.util.UUID;

/**
 * Một địa điểm có thể trùng với địa điểm người dùng sắp tạo.
 *
 * @param spotId         id của địa điểm đã có
 * @param name           tên đã lưu, để hiện "Có phải bạn muốn nói quán này?"
 * @param distanceMeters khoảng cách thật tính bằng mét
 * @param nameSimilarity độ giống tên trong khoảng 0..1 do pg_trgm chấm
 */
public record DuplicateSpotCandidate(
        UUID spotId,
        String name,
        double distanceMeters,
        double nameSimilarity) {
}
