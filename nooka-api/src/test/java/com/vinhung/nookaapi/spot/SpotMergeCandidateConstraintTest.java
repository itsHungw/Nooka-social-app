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
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cặp ứng viên luôn lưu theo thứ tự id tăng dần, ép bằng
 * {@code check (lower_spot_id < higher_spot_id)} cộng {@code unique}.
 *
 * <p>Mẹo này khiến database TỰ chặn việc (A,B) và (B,A) thành hai dòng khác
 * nhau. Không có nó thì bảng chống trùng tự sinh ra bản trùng của chính nó.
 *
 * <p>Bảng chưa có entity JPA: service ghi vào nó thuộc giai đoạn sau. Thứ cần
 * chứng minh bây giờ là constraint đang bật.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class SpotMergeCandidateConstraintTest {

    @Autowired
    private EntityManager em;

    private Spot lower;
    private Spot higher;

    @BeforeEach
    void setUp() {
        User creator = User.builder()
                .email("merge-creator@example.test")
                .passwordHash("unused")
                .username("mergecreator")
                .displayName("merge creator")
                .build();
        em.persist(creator);

        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        Area area = Area.builder().city(city).name("District 3").build();
        em.persist(area);

        Spot first = persistPlace(area, creator.getId(), "Quan A");
        Spot second = persistPlace(area, creator.getId(), "Quan B");
        em.flush();

        // Sắp theo id để test không phụ thuộc thứ tự UUID sinh ra.
        if (first.getId().compareTo(second.getId()) < 0) {
            lower = first;
            higher = second;
        } else {
            lower = second;
            higher = first;
        }
    }

    @Test
    @DisplayName("Cặp đúng thứ tự tăng dần được chấp nhận")
    void pairInAscendingOrderIsAccepted() {
        insertCandidate(lower.getId(), higher.getId());

        Object count = em.createNativeQuery(
                        "select count(*) from spot_merge_candidates where status = 'PENDING'")
                .getSingleResult();

        assertThat(((Number) count).intValue()).isEqualTo(1);
    }

    @Test
    @DisplayName("Cặp ngược thứ tự bị database từ chối")
    void pairInDescendingOrderIsRejected() {
        assertThatThrownBy(() -> insertCandidate(higher.getId(), lower.getId()))
                .hasMessageContaining("spot_merge_candidates_order_check");
    }

    @Test
    @DisplayName("Cùng một cặp không thể có hai dòng")
    void duplicatePairIsRejected() {
        insertCandidate(lower.getId(), higher.getId());

        assertThatThrownBy(() -> insertCandidate(lower.getId(), higher.getId()))
                .hasMessageContaining("spot_merge_candidates_pair_key");
    }

    @Test
    @DisplayName("Trạng thái ngoài ba giá trị cho phép bị từ chối")
    void unknownStatusIsRejected() {
        assertThatThrownBy(() -> {
            em.createNativeQuery("""
                    insert into spot_merge_candidates
                        (lower_spot_id, higher_spot_id, reason, status)
                    values (:lower, :higher, 'NAME_AND_RADIUS', 'MAYBE')
                    """)
                    .setParameter("lower", lower.getId())
                    .setParameter("higher", higher.getId())
                    .executeUpdate();
            em.flush();
        }).hasMessageContaining("spot_merge_candidates_status_check");
    }

    private void insertCandidate(UUID lowerId, UUID higherId) {
        em.createNativeQuery("""
                insert into spot_merge_candidates
                    (lower_spot_id, higher_spot_id, reason, distance_m, name_similarity)
                values (:lower, :higher, 'NAME_AND_RADIUS', 42.5, 0.812)
                """)
                .setParameter("lower", lowerId)
                .setParameter("higher", higherId)
                .executeUpdate();
        em.flush();
    }

    private Spot persistPlace(Area area, UUID creatorId, String name) {
        Place place = Place.builder().name(name).area(area).createdById(creatorId).build();
        em.persist(place);
        return place;
    }
}
