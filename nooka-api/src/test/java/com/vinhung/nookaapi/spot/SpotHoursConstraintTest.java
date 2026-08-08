package com.vinhung.nookaapi.spot;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.spot.entity.Area;
import com.vinhung.nookaapi.spot.entity.City;
import com.vinhung.nookaapi.spot.entity.Place;
import com.vinhung.nookaapi.spot.entity.Spot;
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
 * Trang quán hiện "Open · until 10pm". Giờ lưu dạng {@code time} không có
 * timezone vì "mở 7 giờ sáng" là câu nói về giờ địa phương, không phải một thời
 * điểm tuyệt đối; {@code cities.timezone} là chỗ đổi nó thành thời điểm.
 *
 * <p>Không có dòng cho một ngày nghĩa là đóng cửa ngày đó — không cần cột
 * is_closed.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class SpotHoursConstraintTest {

    @Autowired
    private EntityManager em;

    private Spot spot;

    @BeforeEach
    void setUp() {
        User creator = User.builder()
                .email("hours-creator@example.test")
                .passwordHash("unused")
                .username("hourscreator")
                .displayName("hours creator")
                .build();
        em.persist(creator);

        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        Area area = Area.builder().city(city).name("District 1").build();
        em.persist(area);

        spot = Place.builder()
                .name("The Workshop Coffee")
                .area(area)
                .createdById(creator.getId())
                .build();
        em.persist(spot);
        em.flush();
    }

    @Test
    @DisplayName("Giờ mở cửa bình thường ghi được")
    void ordinaryOpeningHoursArePersisted() {
        insertHours(1, "08:00", "22:00", "USER");

        Object count = em.createNativeQuery(
                        "select count(*) from spot_hours where spot_id = :id")
                .setParameter("id", spot.getId())
                .getSingleResult();

        assertThat(((Number) count).intValue()).isEqualTo(1);
    }

    @Test
    @DisplayName("Quán đóng cửa sau nửa đêm ghi được: closes_at nhỏ hơn opens_at")
    void overnightHoursAreAllowed() {
        insertHours(5, "18:00", "02:00", "OWNER");

        Object closes = em.createNativeQuery(
                        "select closes_at from spot_hours where spot_id = :id")
                .setParameter("id", spot.getId())
                .getSingleResult();

        assertThat(closes.toString()).startsWith("02:00");
    }

    @Test
    @DisplayName("Ngày trong tuần ngoài khoảng 0..6 bị từ chối")
    void dayOfWeekOutsideRangeIsRejected() {
        assertThatThrownBy(() -> insertHours(7, "08:00", "22:00", "USER"))
                .hasMessageContaining("spot_hours_day_check");
    }

    @Test
    @DisplayName("Nguồn ngoài ba giá trị cho phép bị từ chối")
    void unknownSourceIsRejected() {
        assertThatThrownBy(() -> insertHours(1, "08:00", "22:00", "GOOGLE"))
                .hasMessageContaining("spot_hours_source_check");
    }

    @Test
    @DisplayName("Không thể có hai khung giờ trùng nhau cùng ngày cùng giờ mở")
    void duplicateOpeningSlotIsRejected() {
        insertHours(1, "08:00", "12:00", "USER");

        assertThatThrownBy(() -> insertHours(1, "08:00", "22:00", "OWNER"))
                .hasMessageContaining("spot_hours_slot_key");
    }

    @Test
    @DisplayName("Một ngày có hai ca nghỉ trưa vẫn ghi được")
    void twoShiftsOnTheSameDayAreAllowed() {
        insertHours(1, "08:00", "12:00", "USER");
        insertHours(1, "14:00", "22:00", "USER");

        Object count = em.createNativeQuery(
                        "select count(*) from spot_hours where spot_id = :id and day_of_week = 1")
                .setParameter("id", spot.getId())
                .getSingleResult();

        assertThat(((Number) count).intValue()).isEqualTo(2);
    }

    private void insertHours(int dayOfWeek, String opensAt, String closesAt, String source) {
        em.createNativeQuery("""
                insert into spot_hours (spot_id, day_of_week, opens_at, closes_at, source)
                values (:spot, :day, cast(:opens as time), cast(:closes as time), :source)
                """)
                .setParameter("spot", spot.getId())
                .setParameter("day", dayOfWeek)
                .setParameter("opens", opensAt)
                .setParameter("closes", closesAt)
                .setParameter("source", source)
                .executeUpdate();
        em.flush();
    }
}
