package com.vinhung.nookaapi.spot.entity;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * Workshop, tour, lớp học, sự kiện (§7).
 *
 * <p>Bản đầu chưa có booking, nhưng cột giá vé phải tồn tại từ schema đầu tiên
 * — đó là lý do Experience không nằm chung bảng với Place.
 */
@Entity
@Table(name = "experiences")
@DiscriminatorValue("EXPERIENCE")
@PrimaryKeyJoinColumn(name = "spot_id")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Experience extends Spot {

    @Column(name = "price_amount", precision = 12, scale = 2)
    private BigDecimal priceAmount;

    @Column(name = "price_currency", length = 3)
    private String priceCurrency;

    @Column(name = "starts_at")
    private Instant startsAt;

    @Column(name = "ends_at")
    private Instant endsAt;
}

