package com.vinhung.nookaapi.tag.api;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;

/**
 * Cổng đọc danh mục thẻ cho module khác.
 *
 * <p>Tồn tại để module khác không phải chạm bảng {@code tags}, và để phần nhãn
 * hiển thị theo ngôn ngữ về sau chỉ phải thêm vào một chỗ.
 */
public interface TagCatalog {

    /**
     * Tra {@code slug} theo id, bỏ qua id không tồn tại.
     *
     * <p>Nhận cả tập một lượt thay vì tra từng cái: người gọi luôn có sẵn một
     * danh sách thẻ, và tra lẻ là N+1 ngay trên trang địa điểm.
     */
    Map<UUID, String> slugsFor(Collection<UUID> tagIds);
}
