package com.vinhung.nookaapi.post;

/**
 * Bốn mức hiển thị ở §13 của spec.
 *
 * <p>Thứ tự khai báo không mang ý nghĩa "rộng dần" và không được dùng để so
 * sánh: {@code CLOSE_FRIENDS} không phải tập con của {@code FOLLOWERS} — một
 * close friend có thể chưa từng bấm follow. Mọi quyết định cho xem hay không
 * phải đi qua {@link PostVisibilityRules}.
 */
public enum Visibility {

    /** Mọi người, và xuất hiện trong discovery. */
    PUBLIC,

    /** Người đang follow tác giả. */
    FOLLOWERS,

    /** Danh sách close friends một chiều do tác giả tự chọn. */
    CLOSE_FRIENDS,

    /** Chỉ tác giả. */
    PRIVATE
}
