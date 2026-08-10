package com.vinhung.nookaapi.spot;

import static org.assertj.core.api.Assertions.assertThat;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.spot.entity.City;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * Trang quán hiện "Open · until 10pm". Muốn biết BÂY GIỜ có mở không thì phải
 * so giờ hiện tại theo giờ địa phương của thành phố, không phải giờ server.
 * Thiếu cột này thì mở rộng ra Bangkok là sai giờ toàn bộ.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class CityTimezoneTest {

    @Autowired
    private EntityManager em;

    @Test
    @DisplayName("Thành phố mới mặc định múi giờ Việt Nam")
    void newCityDefaultsToVietnamTimezone() {
        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        em.flush();
        em.clear();

        City reloaded = em.find(City.class, city.getId());

        assertThat(reloaded.getTimezone()).isEqualTo("Asia/Ho_Chi_Minh");
    }

    @Test
    @DisplayName("Múi giờ đặt tường minh được giữ nguyên")
    void explicitTimezoneIsKept() {
        City city = City.builder()
                .name("Bangkok")
                .countryCode("TH")
                .timezone("Asia/Bangkok")
                .build();
        em.persist(city);
        em.flush();
        em.clear();

        assertThat(em.find(City.class, city.getId()).getTimezone()).isEqualTo("Asia/Bangkok");
    }
}
