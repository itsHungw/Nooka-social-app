package com.vinhung.nookaapi.post;

import com.vinhung.nookaapi.common.BaseEntity;
import com.vinhung.nookaapi.spot.Spot;
import com.vinhung.nookaapi.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Bài đăng gắn với một Spot.
 *
 * <p><b>Không truy vấn entity này trực tiếp.</b> Mọi đường đọc Post phải đi qua
 * {@code PostAccess}, thứ ép luật hiển thị ở §13 vào từng câu query. Đây là
 * ràng buộc R2 ở §20, và nó được kiểm bằng test kiến trúc chứ không chỉ bằng
 * quy ước — Spring Boot không có Row Level Security nên không có lưới an toàn
 * nào phía dưới.
 */
@Entity
@Table(name = "posts")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Post extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "spot_id", nullable = false)
    private Spot spot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Visibility visibility;

    private String caption;

    @Column(name = "one_thing_to_know")
    private String oneThingToKnow;

    private String occasion;

    @Column(name = "price_amount", precision = 12, scale = 2)
    private BigDecimal priceAmount;

    @Column(name = "price_currency", length = 3)
    private String priceCurrency;

    @Column(name = "party_size")
    private Integer partySize;

    @Column(name = "would_return")
    private Boolean wouldReturn;

    /**
     * §13: ảnh cộng địa điểm cộng thời gian đăng vẫn tiết lộ user đang ở đâu
     * ngay lúc này, dù không có real-time location. Bản đầu chốt cho phép ẩn
     * thời gian.
     */
    @Column(name = "hide_time", nullable = false)
    @lombok.Builder.Default
    private boolean hideTime = false;

    /**
     * §10: mắt xích đóng vòng lặp. B đăng bài sau khi đi theo gợi ý của A thì
     * bài của B trỏ về bài của A, nhờ đó A biết gợi ý của mình tạo ra một
     * chuyến đi thật.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspired_by_post_id")
    private Post inspiredBy;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * Xoá mềm: bài đã xoá biến mất khỏi feed nhưng follow-up link trỏ vào nó
     * thì không gãy.
     */
    @Column(name = "deleted_at")
    private Instant deletedAt;
}
