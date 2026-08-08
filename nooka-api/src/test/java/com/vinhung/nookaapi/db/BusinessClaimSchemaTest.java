package com.vinhung.nookaapi.db;

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
 * §12 giai đoạn 1: quán <b>claim</b> trang, không phải <b>tạo</b> trang. Place
 * tồn tại trước do user tạo hoặc đội seed nhập tay; chủ quán nhận quyền sau.
 *
 * <p>Ràng buộc đáng giá nhất ở đây là partial unique index: một quán có thể có
 * nhiều hồ sơ đã bị từ chối trong lịch sử, nhưng không bao giờ có hai hồ sơ chờ
 * cùng lúc — nếu không thì hai người cùng nhận một quán và người duyệt không có
 * căn cứ nào để chọn.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class BusinessClaimSchemaTest {

    @Autowired
    private EntityManager em;

    private Spot spot;
    private User ownerCandidate;
    private User otherCandidate;
    private User moderator;

    @BeforeEach
    void setUp() {
        ownerCandidate = persistUser("shopowner");
        otherCandidate = persistUser("otherclaimant");
        moderator = persistUser("moderator");

        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        Area area = Area.builder().city(city).name("District 1").build();
        em.persist(area);
        spot = Place.builder()
                .name("The Workshop Coffee")
                .area(area)
                .createdById(ownerCandidate.getId())
                .build();
        em.persist(spot);
        em.flush();
    }

    @Test
    @DisplayName("Hồ sơ claim mới mặc định đang chờ duyệt")
    void newClaimIsPending() {
        insertClaim(ownerCandidate, "{}");

        Object status = em.createNativeQuery(
                        "select status from spot_claims where spot_id = :s")
                .setParameter("s", spot.getId())
                .getSingleResult();

        assertThat(status).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("Một quán không thể có hai hồ sơ đang chờ cùng lúc")
    void onlyOnePendingClaimPerSpot() {
        insertClaim(ownerCandidate, "{}");

        assertThatThrownBy(() -> insertClaim(otherCandidate, "{}"))
                .hasMessageContaining("spot_claims_one_pending_idx");
    }

    @Test
    @DisplayName("Hồ sơ bị từ chối không chặn hồ sơ mới")
    void rejectedClaimDoesNotBlockANewOne() {
        insertClaim(ownerCandidate, "{}");
        resolveClaim("REJECTED", "không đủ bằng chứng");

        insertClaim(otherCandidate, "{}");

        Object pending = em.createNativeQuery("""
                select count(*) from spot_claims where spot_id = :s and status = 'PENDING'
                """)
                .setParameter("s", spot.getId())
                .getSingleResult();

        assertThat(((Number) pending).intValue()).isEqualTo(1);
    }

    @Test
    @DisplayName("Một quán có thể có nhiều hồ sơ đã đóng trong lịch sử")
    void historyOfClosedClaimsIsKept() {
        insertClaim(ownerCandidate, "{}");
        resolveClaim("REJECTED", "sai giấy tờ");
        insertClaim(otherCandidate, "{}");
        resolveClaim("WITHDRAWN", null);

        Object total = em.createNativeQuery(
                        "select count(*) from spot_claims where spot_id = :s")
                .setParameter("s", spot.getId())
                .getSingleResult();

        assertThat(((Number) total).intValue()).isEqualTo(2);
    }

    @Test
    @DisplayName("Trạng thái ngoài bốn giá trị cho phép bị từ chối")
    void unknownStatusIsRejected() {
        assertThatThrownBy(() -> {
            em.createNativeQuery("""
                    insert into spot_claims (spot_id, claimant_id, status)
                    values (:s, :c, 'MAYBE')
                    """)
                    .setParameter("s", spot.getId())
                    .setParameter("c", ownerCandidate.getId())
                    .executeUpdate();
            em.flush();
        }).hasMessageContaining("spot_claims_status_check");
    }

    @Test
    @DisplayName("Bằng chứng jsonb đổi hình dạng được mà không cần migration")
    void evidenceShapeCanChangeFreely() {
        insertClaim(ownerCandidate,
                "{\"kind\":\"domain_email\",\"email\":\"owner@workshop.vn\",\"verifiedAt\":\"2026-08-08\"}");

        Object kind = em.createNativeQuery("""
                select evidence ->> 'kind' from spot_claims where spot_id = :s
                """)
                .setParameter("s", spot.getId())
                .getSingleResult();

        assertThat(kind).isEqualTo("domain_email");
    }

    @Test
    @DisplayName("Duyệt xong thì cấp quyền quản lý, và vai trò chỉ có OWNER hoặc STAFF")
    void approvingGrantsManagementRights() {
        insertClaim(ownerCandidate, "{}");
        resolveClaim("APPROVED", null);
        insertManager(ownerCandidate, "OWNER");
        insertManager(otherCandidate, "STAFF");

        Object active = em.createNativeQuery("""
                select count(*) from spot_managers where spot_id = :s and revoked_at is null
                """)
                .setParameter("s", spot.getId())
                .getSingleResult();

        assertThat(((Number) active).intValue()).isEqualTo(2);
    }

    @Test
    @DisplayName("Vai trò ngoài hai giá trị cho phép bị từ chối")
    void unknownRoleIsRejected() {
        assertThatThrownBy(() -> insertManager(ownerCandidate, "ADMIN"))
                .hasMessageContaining("spot_managers_role_check");
    }

    @Test
    @DisplayName("Một người chỉ có một dòng quản lý cho mỗi quán")
    void oneManagerRowPerPersonPerSpot() {
        insertManager(ownerCandidate, "OWNER");

        assertThatThrownBy(() -> insertManager(ownerCandidate, "STAFF"))
                .hasMessageContaining("spot_managers_pkey");
    }

    @Test
    @DisplayName("Thu hồi quyền giữ lại lịch sử thay vì xoá dòng")
    void revokingKeepsTheRow() {
        insertManager(ownerCandidate, "OWNER");
        em.createNativeQuery("""
                update spot_managers set revoked_at = now() where spot_id = :s and user_id = :u
                """)
                .setParameter("s", spot.getId())
                .setParameter("u", ownerCandidate.getId())
                .executeUpdate();
        em.flush();

        Object rows = em.createNativeQuery(
                        "select count(*) from spot_managers where spot_id = :s")
                .setParameter("s", spot.getId())
                .getSingleResult();
        Object active = em.createNativeQuery("""
                select count(*) from spot_managers where spot_id = :s and revoked_at is null
                """)
                .setParameter("s", spot.getId())
                .getSingleResult();

        assertThat(((Number) rows).intValue()).isEqualTo(1);
        assertThat(((Number) active).intValue()).isZero();
    }

    // ---- fixtures --------------------------------------------------------

    private void insertClaim(User claimant, String evidenceJson) {
        em.createNativeQuery("""
                insert into spot_claims (spot_id, claimant_id, evidence)
                values (:s, :c, cast(:e as jsonb))
                """)
                .setParameter("s", spot.getId())
                .setParameter("c", claimant.getId())
                .setParameter("e", evidenceJson)
                .executeUpdate();
        em.flush();
    }

    private void resolveClaim(String status, String reason) {
        em.createNativeQuery("""
                update spot_claims
                set status = :status, reviewed_by = :by, reviewed_at = now(), reject_reason = :reason
                where spot_id = :s and status = 'PENDING'
                """)
                .setParameter("status", status)
                .setParameter("by", moderator.getId())
                .setParameter("reason", reason)
                .setParameter("s", spot.getId())
                .executeUpdate();
        em.flush();
    }

    private void insertManager(User user, String role) {
        em.createNativeQuery("""
                insert into spot_managers (spot_id, user_id, role, granted_by)
                values (:s, :u, :role, :by)
                """)
                .setParameter("s", spot.getId())
                .setParameter("u", user.getId())
                .setParameter("role", role)
                .setParameter("by", moderator.getId())
                .executeUpdate();
        em.flush();
    }

    private User persistUser(String username) {
        User user = User.builder()
                .email(username + "@example.test")
                .passwordHash("unused")
                .username(username)
                .displayName(username)
                .build();
        em.persist(user);
        em.flush();
        return user;
    }
}
