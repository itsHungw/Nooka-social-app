package com.vinhung.nookaapi.shared.model;

/**
 * Bốn mức hiển thị ở §13 của spec.
 *
 * <p>Đây là value dùng chung giữa cấu hình mặc định của User và Post. Đặt ở
 * shared tránh tạo dependency cycle user ↔ post.
 */
public enum Visibility {
    PUBLIC,
    FOLLOWERS,
    CLOSE_FRIENDS,
    SELECTED_FRIENDS,
    PRIVATE
}
