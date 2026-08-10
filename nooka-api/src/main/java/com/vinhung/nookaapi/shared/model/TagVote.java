package com.vinhung.nookaapi.shared.model;

import java.util.UUID;

/**
 * Một người đã gán một thẻ cho một địa điểm.
 *
 * <p>Nằm ở {@code shared} vì hai module cùng sinh ra nó với đúng một ngữ nghĩa:
 * {@code post} khi tác giả chọn thẻ sau lúc đăng bài, và {@code review} khi câu
 * trả lời sinh thẻ qua {@code grants_tag_id}.
 *
 * <p>Giữ cả {@code userId} chứ không gộp sẵn thành số đếm là chủ ý. Cùng một
 * người có thể vừa gắn thẻ trên bài vừa trả lời review sinh đúng thẻ đó — nếu
 * mỗi bên tự đếm rồi cộng lại thì một người thành hai phiếu. Giao diện ghi "34"
 * và người đọc hiểu là 34 <em>người</em>, không phải 34 phiếu.
 *
 * @param tagId  thẻ được gán
 * @param userId người gán
 */
public record TagVote(UUID tagId, UUID userId) {
}
