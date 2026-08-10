package com.vinhung.nookaapi.tag.model.enums;

/**
 * Thẻ nói về mặt nào của một địa điểm.
 *
 * <p>Phân loại này quyết định thẻ hiện ở đâu trên giao diện, và về sau quyết
 * định thẻ nào được dùng làm bộ lọc cứng khi xếp hạng — "dưới 500K" là ràng
 * buộc không được bỏ qua (§14), còn "yên tĩnh" chỉ là ưu tiên.
 */
public enum TagKind {

    /** Cảm giác của chỗ đó: quiet, niceView, noisyWeekend. */
    VIBE,

    /** Thứ có hay không có: workFriendly, takeaway, outdoor. */
    FACILITY,

    /** Mức giá: goodPrice. */
    PRICE,

    /** Hợp dịp gì: firstDate, lateNight. */
    OCCASION
}
