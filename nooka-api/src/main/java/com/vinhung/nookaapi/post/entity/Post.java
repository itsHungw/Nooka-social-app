package com.vinhung.nookaapi.post.entity;

import com.vinhung.nookaapi.shared.entity.BaseEntity;
import com.vinhung.nookaapi.shared.model.Visibility;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Bài đăng gắn với một Spot.
 *
 * <p>Không truy vấn entity này trực tiếp. Mọi đường đọc Post phải đi qua
 * {@code post.api.PostAccess} để visibility luôn được áp trong SQL.
 */
@Entity
@Table(name = "posts")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Post extends BaseEntity {

    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    @Column(name = "spot_id", nullable = false)
    private UUID spotId;

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

    @Column(name = "hide_time", nullable = false)
    @lombok.Builder.Default
    private boolean hideTime = false;

    @Column(name = "inspired_by_post_id")
    private UUID inspiredByPostId;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
