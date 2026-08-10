package com.vinhung.nookaapi.db;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.spot.entity.Area;
import com.vinhung.nookaapi.spot.entity.City;
import com.vinhung.nookaapi.spot.entity.Place;
import com.vinhung.nookaapi.user.entity.User;
import jakarta.persistence.EntityManager;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * V1 để {@code reports.reporter_id ... on delete cascade}. Hệ quả: người bị
 * quấy rối gửi báo cáo rồi rời app vì quá mệt, và bằng chứng đi theo họ trong
 * khi kẻ kia sạch hồ sơ. Đây là lỗ về an toàn, không phải chuyện gọn gàng dữ
 * liệu.
 *
 * <p>Ba bảng trong test này chưa có entity JPA và vẫn chưa cần; entity sẽ đến
 * cùng service ghi vào chúng. Thứ cần chứng minh bây giờ là constraint đang bật.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class ReportsAndNotificationsTest {

    @Autowired
    private EntityManager em;

    @Test
    @DisplayName("Xoá tài khoản người báo cáo thì báo cáo vẫn còn")
    void reportSurvivesDeletionOfItsReporter() {
        User reporter = persistUser("reporter");
        User reported = persistUser("reported");

        em.createNativeQuery("""
                insert into reports (reporter_id, reported_user_id, reason)
                values (:reporter, :reported, 'harassment')
                """)
                .setParameter("reporter", reporter.getId())
                .setParameter("reported", reported.getId())
                .executeUpdate();

        deleteUser(reporter.getId());

        Object count = em.createNativeQuery(
                        "select count(*) from reports where reported_user_id = :id")
                .setParameter("id", reported.getId())
                .getSingleResult();

        assertThat(((Number) count).intValue()).isEqualTo(1);
    }

    @Test
    @DisplayName("Báo cáo của tài khoản đã xoá không còn trỏ vào ai")
    void orphanedReportHasNullReporter() {
        User reporter = persistUser("orphanreporter");
        User reported = persistUser("orphanreported");

        em.createNativeQuery("""
                insert into reports (reporter_id, reported_user_id, reason)
                values (:reporter, :reported, 'spam')
                """)
                .setParameter("reporter", reporter.getId())
                .setParameter("reported", reported.getId())
                .executeUpdate();

        deleteUser(reporter.getId());

        Object count = em.createNativeQuery("""
                select count(*) from reports
                where reported_user_id = :id and reporter_id is null
                """)
                .setParameter("id", reported.getId())
                .getSingleResult();

        assertThat(((Number) count).intValue()).isEqualTo(1);
    }

    @Test
    @DisplayName("Thông báo chưa đọc cùng group_key không thể có hai dòng")
    void unreadNotificationsWithSameGroupKeyAreCollapsed() {
        User recipient = persistUser("notified");
        insertNotification(recipient.getId(), "REACTION", "post:abc");

        assertThatThrownBy(() -> insertNotification(recipient.getId(), "REACTION", "post:abc"))
                .hasMessageContaining("notifications_group_idx");
    }

    @Test
    @DisplayName("Thông báo không có group_key thì không bị gộp")
    void notificationsWithoutGroupKeyAreNotCollapsed() {
        User recipient = persistUser("ungrouped");
        insertNotification(recipient.getId(), "FOLLOW", null);
        insertNotification(recipient.getId(), "FOLLOW", null);

        Object count = em.createNativeQuery(
                        "select count(*) from notifications where recipient_id = :id")
                .setParameter("id", recipient.getId())
                .getSingleResult();

        assertThat(((Number) count).intValue()).isEqualTo(2);
    }

    @Test
    @DisplayName("Payload jsonb ghi và đọc lại được")
    void notificationPayloadRoundTrips() {
        User recipient = persistUser("payload");
        em.createNativeQuery("""
                insert into notifications (recipient_id, type, payload)
                values (:id, 'CLAIM_APPROVED', cast(:payload as jsonb))
                """)
                .setParameter("id", recipient.getId())
                .setParameter("payload", "{\"claimId\":\"c-1\",\"spotName\":\"Workshop\"}")
                .executeUpdate();
        em.flush();

        Object spotName = em.createNativeQuery("""
                select payload ->> 'spotName' from notifications where recipient_id = :id
                """)
                .setParameter("id", recipient.getId())
                .getSingleResult();

        assertThat(spotName).isEqualTo("Workshop");
    }

    @Test
    @DisplayName("Ảnh mới mặc định READY")
    void newMediaDefaultsToReady() {
        UUID postId = persistPostReturningId("mediaready");
        em.createNativeQuery("""
                insert into post_media (post_id, url) values (:postId, 'https://cdn.example/a.jpg')
                """)
                .setParameter("postId", postId)
                .executeUpdate();
        em.flush();

        Object status = em.createNativeQuery(
                        "select status from post_media where post_id = :postId")
                .setParameter("postId", postId)
                .getSingleResult();

        assertThat(status).isEqualTo("READY");
    }

    @Test
    @DisplayName("Trạng thái ảnh ngoài bốn giá trị cho phép bị từ chối")
    void unknownMediaStatusIsRejected() {
        UUID postId = persistPostReturningId("mediabogus");

        assertThatThrownBy(() -> {
            em.createNativeQuery("""
                    insert into post_media (post_id, url, status)
                    values (:postId, 'https://cdn.example/b.jpg', 'BOGUS')
                    """)
                    .setParameter("postId", postId)
                    .executeUpdate();
            em.flush();
        }).hasMessageContaining("post_media_status_check");
    }

    /**
     * Xoá bằng SQL thô sau khi đẩy hết thay đổi đang chờ, rồi dọn persistence
     * context. Không có {@code clear()} thì bản managed của user đã xoá vẫn nằm
     * trong context và lần flush sau sẽ cố ghi lại nó.
     */
    private void deleteUser(UUID userId) {
        em.flush();
        em.createNativeQuery("delete from users where id = :id")
                .setParameter("id", userId)
                .executeUpdate();
        em.flush();
        em.clear();
    }

    /**
     * {@code post_media.post_id} là khoá ngoại not null nên test trạng thái ảnh
     * cần một bài viết thật. Dựng phần Post bằng SQL thô để test này không phụ
     * thuộc entity của module {@code post}.
     */
    private UUID persistPostReturningId(String usernamePrefix) {
        User author = persistUser(usernamePrefix);
        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        Area area = Area.builder().city(city).name("District 1").build();
        em.persist(area);
        Place place = Place.builder()
                .name("Quan ca phe")
                .area(area)
                .createdById(author.getId())
                .build();
        em.persist(place);
        em.flush();

        UUID postId = UUID.randomUUID();
        em.createNativeQuery("""
                insert into posts (id, author_id, spot_id, visibility)
                values (:id, :author, :spot, 'PUBLIC')
                """)
                .setParameter("id", postId)
                .setParameter("author", author.getId())
                .setParameter("spot", place.getId())
                .executeUpdate();
        em.flush();
        return postId;
    }

    private void insertNotification(UUID recipientId, String type, String groupKey) {
        em.createNativeQuery("""
                insert into notifications (recipient_id, type, group_key)
                values (:id, :type, :groupKey)
                """)
                .setParameter("id", recipientId)
                .setParameter("type", type)
                .setParameter("groupKey", groupKey)
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
