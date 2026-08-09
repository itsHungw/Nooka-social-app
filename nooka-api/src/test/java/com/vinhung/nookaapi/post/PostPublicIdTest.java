package com.vinhung.nookaapi.post;

import static org.assertj.core.api.Assertions.assertThat;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.post.entity.Post;
import com.vinhung.nookaapi.shared.model.Visibility;
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
 * UUID v7 kể ra thời điểm tạo vì mốc thời gian nằm ngay trong id, mà
 * {@code posts.hide_time} tồn tại để giấu đúng thứ đó — và id nằm trong URL.
 *
 * <p>Nên bài viết có hai định danh: {@code id} v7 dùng nội bộ và trong khoá
 * ngoại, {@code public_id} ngẫu nhiên là thứ duy nhất xuất hiện trong API và
 * URL. Lợi thêm: không ai dò được số bài viết của hệ thống.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class PostPublicIdTest {

    @Autowired
    private EntityManager em;

    private User author;
    private Spot spot;

    @BeforeEach
    void setUp() {
        author = User.builder()
                .email("publicid-author@example.test")
                .passwordHash("unused")
                .username("publicidauthor")
                .displayName("public id author")
                .build();
        em.persist(author);

        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        Area area = Area.builder().city(city).name("District 1").build();
        em.persist(area);
        spot = Place.builder().name("Quan ca phe").area(area).createdById(author.getId()).build();
        em.persist(spot);
        em.flush();
    }

    @Test
    @DisplayName("Bài mới tự có public_id")
    void newPostGetsAPublicId() {
        Post post = persistPost();

        assertThat(em.find(Post.class, post.getId()).getPublicId()).isNotNull();
    }

    @Test
    @DisplayName("public_id khác id, và không phải v7 nên không kể ra thời điểm đăng")
    void publicIdDiffersFromInternalIdAndIsRandom() {
        Post post = persistPost();
        Post reloaded = em.find(Post.class, post.getId());

        assertThat(reloaded.getPublicId()).isNotEqualTo(reloaded.getId());
        assertThat(reloaded.getId().version()).isEqualTo(7);
        assertThat(reloaded.getPublicId().version()).isEqualTo(4);
    }

    @Test
    @DisplayName("Hai bài có public_id khác nhau")
    void publicIdsAreUniqueAcrossPosts() {
        Post first = persistPost();
        Post second = persistPost();

        assertThat(em.find(Post.class, first.getId()).getPublicId())
                .isNotEqualTo(em.find(Post.class, second.getId()).getPublicId());
    }

    private Post persistPost() {
        Post post = Post.builder()
                .authorId(author.getId())
                .spotId(spot.getId())
                .visibility(Visibility.PUBLIC)
                .caption("ca phe ngon")
                .build();
        em.persist(post);
        em.flush();
        em.clear();
        return post;
    }
}
