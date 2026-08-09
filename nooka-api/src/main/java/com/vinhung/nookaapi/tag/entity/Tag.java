package com.vinhung.nookaapi.tag.entity;

import com.vinhung.nookaapi.shared.entity.BaseEntity;
import com.vinhung.nookaapi.tag.model.enums.TagKind;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * Một thẻ mô tả địa điểm, ví dụ {@code quiet} hay {@code workFriendly}.
 *
 * <p>Nằm trong database chứ không phải hằng số trong code, vì §12 nói moat số
 * hai là "metadata có cấu trúc từ lần đi thật" — bộ thẻ sẽ còn mở rộng, và mỗi
 * lần mở rộng không nên là một lần phát hành app.
 *
 * <p>Nhãn hiển thị không nằm ở đây mà ở {@code tag_translations}: một thẻ có
 * nhiều ngôn ngữ, và từ đồng nghĩa dùng để khớp câu hỏi tự do cũng theo ngôn
 * ngữ.
 */
@Entity
@Table(name = "tags")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Tag extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TagKind kind;

    /** Hiện trong sheet chọn thẻ sau khi đăng bài. */
    @Column(nullable = false)
    @Builder.Default
    private boolean pickable = true;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    /**
     * Ngừng dùng chứ không xoá.
     *
     * <p>Thẻ đã gắn vào bài viết và câu trả lời review; xoá là mất lịch sử và
     * làm gãy mọi thống kê đã tính. Khoá ngoại từ {@code post_vibe_tags} dùng
     * {@code on delete restrict} để chặn việc xoá nhầm.
     */
    @Column(name = "archived_at")
    private Instant archivedAt;

    public boolean isActive() {
        return archivedAt == null;
    }
}
