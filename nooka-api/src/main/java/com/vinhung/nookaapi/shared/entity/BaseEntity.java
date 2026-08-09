package com.vinhung.nookaapi.shared.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.proxy.HibernateProxy;

/**
 * Phần chung của mọi entity có khoá chính đơn: id và thời điểm tạo.
 *
 * <p>{@code equals} và {@code hashCode} được viết tay ở đây thay vì để Lombok
 * sinh, và đó là lý do lớp này tồn tại. {@code @Data} hay
 * {@code @EqualsAndHashCode} mặc định sẽ so sánh toàn bộ field, khiến một
 * entity đổi hash sau khi persist — nếu nó đang nằm trong {@code HashSet} thì
 * không tìm lại được nữa. Viết đúng một lần ở lớp cha thì không ai phải nhớ
 * quy tắc này khi thêm entity mới.
 */
@MappedSuperclass
@Getter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public abstract class BaseEntity {

    /**
     * UUID v7 chứ không phải v4: mốc thời gian nằm ở 48 bit đầu nên bản ghi mới
     * dồn về mép phải của B-tree thay vì rơi ngẫu nhiên khắp index. Với bảng ghi
     * nhiều như {@code posts} và {@code messages}, khác biệt đó là index không
     * phình và WAL không phồng vì ghi nguyên trang sau checkpoint.
     *
     * <p><b>KHÔNG dùng {@code Style.TIME}.</b> Tên nghe hợp lý nhưng nó là UUID
     * v1 và nhúng địa chỉ IP/MAC của máy chủ vào id — trong một app lấy privacy
     * làm ràng buộc sản phẩm thì đó là lỗi nghiêm trọng. {@code BaseEntityIdTest}
     * khoá lại điều này.
     *
     * <p>{@code VERSION_7} đang là {@code @Incubating} trong Hibernate. Nếu API
     * đổi khi nâng version, đây là chỗ duy nhất phải sửa.
     *
     * <p>Cột vẫn giữ {@code default gen_random_uuid()} ở database làm lưới an
     * toàn cho seed script viết bằng SQL thuần; ở đó tính cục bộ của index không
     * quan trọng nên v4 lẫn vào là chấp nhận được.
     */
    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * Hai entity bằng nhau khi cùng kiểu và cùng id đã được gán.
     *
     * <p>Entity chưa persist có id null nên không bằng bất cứ thứ gì, kể cả một
     * entity chưa persist khác — đó là chủ ý: chúng là hai đối tượng khác nhau
     * cho tới khi database nói khác.
     */
    @Override
    public final boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null) {
            return false;
        }
        // Hibernate đưa ra proxy khi truy cập lazy; getClass() trên proxy trả về
        // lớp con sinh tự động, không khớp lớp thật. Phải hỏi qua proxy.
        Class<?> thisType = effectiveClass(this);
        Class<?> otherType = effectiveClass(o);
        if (thisType != otherType) {
            return false;
        }
        UUID thisId = this.getId();
        return thisId != null && thisId.equals(((BaseEntity) o).getId());
    }

    /**
     * Hằng số theo kiểu, không theo id.
     *
     * <p>Id được gán lúc persist, nên nếu hash phụ thuộc id thì entity sẽ nhảy
     * bucket ngay giữa lúc đang nằm trong collection. Trả về hash của kiểu là
     * hợp lệ và ổn định — đổi lại các entity cùng kiểu rơi chung một bucket,
     * điều chỉ đáng lo nếu ta nhét hàng nghìn entity vào một Set trong bộ nhớ.
     */
    @Override
    public final int hashCode() {
        return effectiveClass(this).hashCode();
    }

    private static Class<?> effectiveClass(Object o) {
        return o instanceof HibernateProxy proxy
                ? proxy.getHibernateLazyInitializer().getPersistentClass()
                : o.getClass();
    }
}

