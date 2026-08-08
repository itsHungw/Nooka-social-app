package com.vinhung.nookaapi.user.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.spot.entity.Area;
import com.vinhung.nookaapi.spot.entity.City;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bốn cột hồ sơ đến từ `app/edit-profile.tsx` và `app/(tabs)/profile.tsx`;
 * hai cột xoá tài khoản đến từ mục 12.2 của spec.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class UserProfileColumnsTest {

    @Autowired
    private EntityManager em;

    @Test
    @DisplayName("Tài khoản mới mặc định locale vi, bật hiện trạng thái, chưa xoá")
    void newUserHasSensibleDefaults() {
        User user = persistUser("defaults");
        em.clear();

        User reloaded = em.find(User.class, user.getId());

        assertThat(reloaded.getLocale()).isEqualTo("vi");
        assertThat(reloaded.isShowActivityStatus()).isTrue();
        assertThat(reloaded.getDeletedAt()).isNull();
        assertThat(reloaded.getAnonymizedAt()).isNull();
        assertThat(reloaded.getBio()).isNull();
        assertThat(reloaded.getHomeAreaId()).isNull();
    }

    @Test
    @DisplayName("Bio giữ được xuống dòng")
    void bioKeepsLineBreaks() {
        User user = persistUser("bio");
        user.setBio("Sits three hours, orders one coffee.\nQuiet corners in D1.");
        em.flush();
        em.clear();

        assertThat(em.find(User.class, user.getId()).getBio())
                .isEqualTo("Sits three hours, orders one coffee.\nQuiet corners in D1.");
    }

    @Test
    @DisplayName("Bio dài quá 300 ký tự bị database từ chối")
    void bioLongerThanThreeHundredCharactersIsRejected() {
        User user = persistUser("longbio");
        user.setBio("x".repeat(301));

        assertThatThrownBy(() -> em.flush()).hasMessageContaining("users_bio_length");
    }

    @Test
    @DisplayName("Bio đúng 300 ký tự được chấp nhận")
    void bioOfExactlyThreeHundredCharactersIsAccepted() {
        User user = persistUser("maxbio");
        user.setBio("x".repeat(300));
        em.flush();
        em.clear();

        assertThat(em.find(User.class, user.getId()).getBio()).hasSize(300);
    }

    @Test
    @DisplayName("home_area_id trỏ được vào một area có thật")
    void homeAreaIdReferencesAnExistingArea() {
        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        Area area = Area.builder().city(city).name("Binh Thanh").build();
        em.persist(area);

        User user = persistUser("located");
        user.setHomeAreaId(area.getId());
        em.flush();
        em.clear();

        assertThat(em.find(User.class, user.getId()).getHomeAreaId()).isEqualTo(area.getId());
    }

    @Test
    @DisplayName("Đánh dấu xoá và ẩn danh ghi được")
    void deletionTimestampsArePersisted() {
        User user = persistUser("deleted");
        Instant now = Instant.now();
        user.setDeletedAt(now);
        user.setAnonymizedAt(now);
        em.flush();
        em.clear();

        User reloaded = em.find(User.class, user.getId());
        assertThat(reloaded.getDeletedAt()).isNotNull();
        assertThat(reloaded.getAnonymizedAt()).isNotNull();
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
