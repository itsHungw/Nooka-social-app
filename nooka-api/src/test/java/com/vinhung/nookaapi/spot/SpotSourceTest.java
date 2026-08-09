package com.vinhung.nookaapi.spot;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.spot.entity.Area;
import com.vinhung.nookaapi.spot.entity.City;
import com.vinhung.nookaapi.spot.entity.Place;
import com.vinhung.nookaapi.spot.entity.Spot;
import com.vinhung.nookaapi.spot.model.enums.SpotSource;
import com.vinhung.nookaapi.user.entity.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * §7 chốt: "User-created + seed thủ công. Không dùng Google Places API làm
 * nguồn dữ liệu gốc."
 *
 * <p>Việc enum KHÔNG có giá trị GOOGLE, và việc check constraint từ chối chuỗi
 * 'GOOGLE', chính là thứ chặn người sau vô tình thêm vào. Điều khoản của Google
 * Maps Platform cấm lưu Content của họ; key và billing project là một, nên vi
 * phạm là mất luôn bản đồ và tính năng chỉ đường.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class SpotSourceTest {

    @Autowired
    private EntityManager em;

    private Area area;
    private User creator;

    @BeforeEach
    void setUp() {
        creator = User.builder()
                .email("creator@example.test")
                .passwordHash("unused")
                .username("creator")
                .displayName("creator")
                .build();
        em.persist(creator);

        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        area = Area.builder().city(city).name("Binh Thanh").build();
        em.persist(area);
        em.flush();
    }

    @Test
    @DisplayName("Spot mới mặc định là do user tạo")
    void newSpotDefaultsToUserCreated() {
        Spot spot = persistPlace("Quan ca phe");
        em.clear();

        assertThat(em.find(Spot.class, spot.getId()).getSource())
                .isEqualTo(SpotSource.USER_CREATED);
    }

    @Test
    @DisplayName("Spot do đội seed tạo đánh dấu được")
    void seededSpotIsMarked() {
        Spot spot = Place.builder()
                .name("Quan seed")
                .area(area)
                .createdById(creator.getId())
                .source(SpotSource.SEEDED)
                .build();
        em.persist(spot);
        em.flush();
        em.clear();

        assertThat(em.find(Spot.class, spot.getId()).getSource()).isEqualTo(SpotSource.SEEDED);
    }

    @Test
    @DisplayName("Enum chỉ có đúng hai giá trị — không có GOOGLE")
    void sourceEnumHasExactlyTwoValues() {
        assertThat(SpotSource.values())
                .containsExactlyInAnyOrder(SpotSource.USER_CREATED, SpotSource.SEEDED);
    }

    @Test
    @DisplayName("Database từ chối nguồn GOOGLE ngay cả khi ghi bằng SQL thô")
    void databaseRejectsGoogleAsSource() {
        Spot spot = persistPlace("Quan bi doi nguon");
        em.clear();

        assertThatThrownBy(() -> {
            em.createNativeQuery("update spots set source = 'GOOGLE' where id = :id")
                    .setParameter("id", spot.getId())
                    .executeUpdate();
            em.flush();
        }).hasMessageContaining("spots_source_check");
    }

    private Spot persistPlace(String name) {
        Spot spot = Place.builder()
                .name(name)
                .area(area)
                .createdById(creator.getId())
                .build();
        em.persist(spot);
        em.flush();
        return spot;
    }
}
