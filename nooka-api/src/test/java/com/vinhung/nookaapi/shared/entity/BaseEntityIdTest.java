package com.vinhung.nookaapi.shared.entity;

import static org.assertj.core.api.Assertions.assertThat;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.spot.entity.City;
import com.vinhung.nookaapi.user.entity.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * UUID v4 hoàn toàn ngẫu nhiên nên mỗi lần chèn rơi vào một trang lá ngẫu nhiên
 * của B-tree: index phình, trang tách liên tục, WAL phồng vì phải ghi nguyên
 * trang sau checkpoint. UUID v7 nhét mốc thời gian vào 48 bit đầu nên bản ghi
 * mới dồn về mép phải.
 *
 * <p>Test này cũng khoá một cái bẫy: {@code Style.TIME} của Hibernate KHÔNG
 * phải v7 — nó là v1 và nhúng địa chỉ IP/MAC của máy chủ vào id. Trong một app
 * lấy privacy làm ràng buộc sản phẩm thì đó là lỗi nghiêm trọng, và nó sẽ đi
 * lọt vì tên hằng số nghe rất hợp lý.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class BaseEntityIdTest {

    @Autowired
    private EntityManager em;

    @Test
    @DisplayName("Id sinh ra là UUID version 7")
    void generatedIdIsVersion7() {
        User user = User.builder()
                .email("uuid-probe@example.test")
                .passwordHash("unused")
                .username("uuidprobe")
                .displayName("uuid probe")
                .build();
        em.persist(user);
        em.flush();

        assertThat(user.getId().version()).isEqualTo(7);
    }

    @Test
    @DisplayName("Id sinh liên tiếp tăng dần theo thời gian")
    void generatedIdsAreTimeOrdered() {
        City first = persistCity("first");
        City second = persistCity("second");

        // v7 xếp mốc thời gian ở 48 bit đầu, nên so sánh theo thứ tự byte cho ra
        // đúng thứ tự thời gian. So bằng chuỗi hex là cách đọc 48 bit đó mà
        // không phải tự dịch bit.
        assertThat(first.getId().toString()).isLessThan(second.getId().toString());
    }

    @Test
    @DisplayName("Id vẫn là variant chuẩn IETF")
    void generatedIdKeepsIetfVariant() {
        City city = persistCity("variant");

        assertThat(city.getId().variant()).isEqualTo(2);
    }

    private City persistCity(String name) {
        City city = City.builder().name(name).countryCode("VN").build();
        em.persist(city);
        em.flush();
        return city;
    }
}
