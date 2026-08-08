package com.vinhung.nookaapi.spot.model.enums;

/**
 * Địa điểm đến từ đâu (§7).
 *
 * <p>Chỉ có hai giá trị, và việc thiếu {@code GOOGLE} là cố ý: §7 chốt
 * "User-created + seed thủ công. Không dùng Google Places API làm nguồn dữ liệu
 * gốc."
 *
 * <p>Điều khoản của Google Maps Platform cấm lưu Content của họ; ngoại lệ duy
 * nhất là {@code place_id}, và ngay cả nó cũng chỉ được dùng làm con trỏ chống
 * trùng nếu sau này thêm autocomplete. Key và billing project là một, nên vi
 * phạm là mất luôn bản đồ và module {@code directions}.
 */
public enum SpotSource {

    /** Do người dùng tạo trong luồng check-in. */
    USER_CREATED,

    /** Do đội seed nhập tay trước khi mở khu vực (§11). */
    SEEDED
}
