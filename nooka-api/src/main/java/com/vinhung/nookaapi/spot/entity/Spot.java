package com.vinhung.nookaapi.spot.entity;

import com.vinhung.nookaapi.shared.entity.BaseEntity;
import com.vinhung.nookaapi.spot.model.enums.SpotSource;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorColumn;
import jakarta.persistence.DiscriminatorType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.UpdateTimestamp;

/** Phần chung của Place và Experience (§7). */
@Entity
@Table(name = "spots")
@Inheritance(strategy = InheritanceType.JOINED)
@DiscriminatorColumn(name = "kind", discriminatorType = DiscriminatorType.STRING)
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public abstract class Spot extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "area_id", nullable = false)
    private Area area;

    /** ID thay cho cross-module User association để giữ module spot độc lập. */
    @Column(name = "created_by", nullable = false)
    private UUID createdById;

    /**
     * Nguồn gốc của địa điểm (§7). Không có giá trị nào cho Google — xem
     * {@link SpotSource}.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SpotSource source = SpotSource.USER_CREATED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "merged_into_id")
    private Spot mergedInto;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
