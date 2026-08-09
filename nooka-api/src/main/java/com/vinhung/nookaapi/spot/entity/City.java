package com.vinhung.nookaapi.spot.entity;

import com.vinhung.nookaapi.shared.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "cities")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class City extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "country_code", nullable = false, length = 2)
    private String countryCode;

    /**
     * Tên timezone theo IANA, ví dụ {@code Asia/Ho_Chi_Minh}.
     *
     * <p>Dùng để đổi giờ mở cửa — lưu dạng giờ địa phương ở {@code spot_hours}
     * — thành một thời điểm tuyệt đối khi cần trả lời "quán này đang mở không".
     * Không có nó thì việc mở rộng ra thành phố khác múi giờ sẽ sai toàn bộ.
     */
    @Column(nullable = false)
    @Builder.Default
    private String timezone = "Asia/Ho_Chi_Minh";
}

