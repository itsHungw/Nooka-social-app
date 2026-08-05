package com.vinhung.nookaapi.spot.entity;

import com.vinhung.nookaapi.shared.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
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
}

