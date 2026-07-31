package com.vinhung.nookaapi.post;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * Cố ý để package-private.
 *
 * <p>Đây là cách R2 ở §20 được ép bằng trình biên dịch chứ không bằng lời dặn:
 * code ngoài package {@code post} không tham chiếu được tới interface này, nên
 * không có đường nào đọc Post mà bỏ qua {@link PostAccess}.
 *
 * <p>Đừng nới thành {@code public}. Nếu một service ở package khác cần đọc
 * Post, hãy thêm phương thức vào {@link PostAccess} — chỗ luật hiển thị luôn
 * được áp — thay vì mở cửa sau.
 */
interface PostRepository extends JpaRepository<Post, UUID>, JpaSpecificationExecutor<Post> {
}
