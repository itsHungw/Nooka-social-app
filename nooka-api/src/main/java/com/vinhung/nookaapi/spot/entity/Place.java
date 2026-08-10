package com.vinhung.nookaapi.spot.entity;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * Không gian cố định: café, quán ăn, bar (§7).
 *
 * <p>Toạ độ dùng {@link BigDecimal} chứ không phải {@code double}: sai số dấu
 * phẩy động ở vĩ độ là sai số vị trí thật, và cột này còn phục vụ việc so trùng
 * trong bán kính.
 */
@Entity
@Table(name = "places")
@DiscriminatorValue("PLACE")
@PrimaryKeyJoinColumn(name = "spot_id")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Place extends Spot {

    private String address;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;
}

