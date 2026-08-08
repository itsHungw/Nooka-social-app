package com.vinhung.nookaapi.insight.api;

import java.util.UUID;

/**
 * Một thẻ của địa điểm kèm số <b>người</b> đã nói.
 *
 * <p>Cố ý là số người chứ không phải số phiếu. Cùng một người có thể vừa gắn thẻ
 * lên bài vừa trả lời review sinh đúng thẻ đó; nếu mỗi nguồn tự đếm rồi cộng lại
 * thì một người thành hai. Giao diện ghi "34" và người đọc hiểu là 34 người.
 *
 * <p>Không có {@code fit} ở đây. Bảng {@code spot_tag_fit} đã tồn tại, nhưng độ
 * hợp chỉ có nghĩa khi xếp hạng — và xếp hạng chưa thuộc phạm vi thiết kế
 * database. Thêm trường đó bây giờ là đoán trước hình dạng của một tính năng
 * chưa viết.
 *
 * @param tagId  thẻ
 * @param slug   khoá i18n của thẻ, ví dụ {@code quiet}
 * @param people số người đã gán thẻ này
 */
public record TagStat(UUID tagId, String slug, long people) {
}
