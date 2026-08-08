package com.vinhung.nookaapi.spot;

import static org.assertj.core.api.Assertions.assertThat;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.spot.api.DuplicateSpotCandidate;
import com.vinhung.nookaapi.spot.api.SpotDuplicateFinder;
import com.vinhung.nookaapi.spot.entity.Area;
import com.vinhung.nookaapi.spot.entity.City;
import com.vinhung.nookaapi.spot.entity.Place;
import com.vinhung.nookaapi.spot.entity.Spot;
import com.vinhung.nookaapi.user.entity.User;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * §7: "cần cơ chế chống trùng place ngay từ đầu (so tên + tọa độ trong bán
 * kính, gợi ý merge), vì user tạo place tự do sẽ sinh ra bản trùng."
 *
 * <p>Hai điều kiện phải cùng đúng. Chỉ so tên thì hai chi nhánh của một chuỗi
 * cách nhau 5km bị coi là trùng; chỉ so toạ độ thì quán cà phê cạnh tiệm bánh
 * mì bị coi là trùng.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class SpotDuplicateFinderTest {

    /** Toạ độ The Workshop Coffee, lấy từ features/nooka/spots.ts. */
    private static final BigDecimal LAT = new BigDecimal("10.772560");
    private static final BigDecimal LNG = new BigDecimal("106.704280");

    @Autowired
    private EntityManager em;

    @Autowired
    private SpotDuplicateFinder finder;

    private Area area;
    private User creator;

    @BeforeEach
    void setUp() {
        creator = User.builder()
                .email("dup-creator@example.test")
                .passwordHash("unused")
                .username("dupcreator")
                .displayName("dup creator")
                .build();
        em.persist(creator);

        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        area = Area.builder().city(city).name("District 1").build();
        em.persist(area);
        em.flush();
    }

    @Test
    @DisplayName("Tên gần giống trong bán kính bị coi là ứng viên trùng")
    void similarNameWithinRadiusIsFound() {
        Spot existing = persistPlace("The Workshop Coffee", LAT, LNG);
        em.flush();
        em.clear();

        List<DuplicateSpotCandidate> found =
                finder.findNear("Workshop Coffee", LAT, LNG, 150, 0.3);

        assertThat(found).extracting(DuplicateSpotCandidate::spotId).contains(existing.getId());
    }

    @Test
    @DisplayName("Cùng tên nhưng ngoài bán kính thì không phải trùng")
    void sameNameOutsideRadiusIsNotFound() {
        // 0.01 độ vĩ ≈ 1.1km, vượt xa bán kính 150m.
        persistPlace("The Workshop Coffee", LAT.add(new BigDecimal("0.010000")), LNG);
        em.flush();
        em.clear();

        List<DuplicateSpotCandidate> found =
                finder.findNear("The Workshop Coffee", LAT, LNG, 150, 0.3);

        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("Cùng toạ độ nhưng tên khác hẳn thì không phải trùng")
    void differentNameAtSameCoordinateIsNotFound() {
        persistPlace("Banh mi Huynh Hoa", LAT, LNG);
        em.flush();
        em.clear();

        List<DuplicateSpotCandidate> found =
                finder.findNear("The Workshop Coffee", LAT, LNG, 150, 0.3);

        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("So tên không phân biệt hoa thường")
    void nameComparisonIgnoresCase() {
        Spot existing = persistPlace("THE WORKSHOP COFFEE", LAT, LNG);
        em.flush();
        em.clear();

        List<DuplicateSpotCandidate> found =
                finder.findNear("the workshop coffee", LAT, LNG, 150, 0.3);

        assertThat(found).extracting(DuplicateSpotCandidate::spotId).contains(existing.getId());
    }

    @Test
    @DisplayName("Spot đã bị gộp không còn là ứng viên trùng")
    void mergedSpotIsExcluded() {
        Spot winner = persistPlace("The Workshop Coffee", LAT, LNG);
        Spot loser = persistPlace("The Workshop Coffee", LAT, LNG);
        loser.setMergedInto(winner);
        em.flush();
        em.clear();

        List<DuplicateSpotCandidate> found =
                finder.findNear("The Workshop Coffee", LAT, LNG, 150, 0.3);

        assertThat(found).extracting(DuplicateSpotCandidate::spotId)
                .contains(winner.getId())
                .doesNotContain(loser.getId());
    }

    @Test
    @DisplayName("Kết quả xếp theo khoảng cách tăng dần và mang khoảng cách thật")
    void resultsAreOrderedByDistanceAndCarryRealDistance() {
        // 0.00090 độ vĩ ≈ 100m; 0.00027 độ vĩ ≈ 30m.
        Spot far = persistPlace("Workshop Coffee Xa", LAT.add(new BigDecimal("0.000900")), LNG);
        Spot near = persistPlace("Workshop Coffee Gan", LAT.add(new BigDecimal("0.000270")), LNG);
        em.flush();
        em.clear();

        List<DuplicateSpotCandidate> found =
                finder.findNear("Workshop Coffee", LAT, LNG, 150, 0.3);

        assertThat(found).extracting(DuplicateSpotCandidate::spotId)
                .containsExactly(near.getId(), far.getId());
        assertThat(found.get(0).distanceMeters()).isBetween(20.0, 45.0);
        assertThat(found.get(1).distanceMeters()).isBetween(85.0, 115.0);
    }

    @Test
    @DisplayName("Không có gì trong bán kính thì trả về danh sách rỗng, không ném lỗi")
    void emptyDatabaseReturnsEmptyList() {
        List<DuplicateSpotCandidate> found =
                finder.findNear("Quan chua ai tao", LAT, LNG, 150, 0.3);

        assertThat(found).isEmpty();
    }

    private Spot persistPlace(String name, BigDecimal latitude, BigDecimal longitude) {
        Place place = Place.builder()
                .name(name)
                .area(area)
                .createdById(creator.getId())
                .latitude(latitude)
                .longitude(longitude)
                .build();
        em.persist(place);
        return place;
    }
}
