package com.vinhung.nookaapi.db;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.post.entity.Post;
import com.vinhung.nookaapi.shared.model.Visibility;
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

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class WantToGoSchemaTest {

    @Autowired
    private EntityManager em;

    private User user;
    private Spot spot;
    private Area area;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .email("want-to-go@example.test")
                .passwordHash("unused")
                .username("wanttogo")
                .displayName("Want to go")
                .build();
        em.persist(user);

        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        area = Area.builder().city(city).name("District 1").build();
        em.persist(area);
        spot = persistPlace("The Workshop Coffee");
        em.flush();
    }

    @Test
    @DisplayName("Want to go và Been được phép cùng tồn tại sau check-in")
    void wantToGoAndBeenCanCoexist() {
        Post source = persistPost(spot);
        insertWantToGo(spot, source);

        em.createNativeQuery("""
                insert into been (user_id, spot_id, first_post_id) values (:user, :spot, :post)
                """)
                .setParameter("user", user.getId())
                .setParameter("spot", spot.getId())
                .setParameter("post", source.getId())
                .executeUpdate();
        em.flush();

        assertThat(rowCount("want_to_go")).isEqualTo(1);
        assertThat(rowCount("been")).isEqualTo(1);
    }

    @Test
    @DisplayName("Post nguồn của Want to go phải thuộc cùng Spot")
    void sourcePostMustBelongToTheSameSpot() {
        Post sourceAtAnotherSpot = persistPost(persistPlace("Another Spot"));

        assertThatThrownBy(() -> insertWantToGo(spot, sourceAtAnotherSpot))
                .hasMessageContaining("want_to_go_source_post_fkey");
    }

    @Test
    @DisplayName("Xoá Post nguồn chỉ clear attribution, không xoá Want to go")
    void deletingSourcePostKeepsWantToGo() {
        Post source = persistPost(spot);
        insertWantToGo(spot, source);

        em.createNativeQuery("delete from posts where id = :post")
                .setParameter("post", source.getId())
                .executeUpdate();
        em.flush();

        Object sourcePostId = em.createNativeQuery("""
                select source_post_id from want_to_go where user_id = :user and spot_id = :spot
                """)
                .setParameter("user", user.getId())
                .setParameter("spot", spot.getId())
                .getSingleResult();

        assertThat(sourcePostId).isNull();
        assertThat(rowCount("want_to_go")).isEqualTo(1);
    }

    private Spot persistPlace(String name) {
        Spot place = Place.builder()
                .name(name)
                .area(area)
                .createdById(user.getId())
                .build();
        em.persist(place);
        em.flush();
        return place;
    }

    private Post persistPost(Spot postSpot) {
        Post post = Post.builder()
                .authorId(user.getId())
                .spotId(postSpot.getId())
                .visibility(Visibility.PUBLIC)
                .caption("Một chỗ đáng ghé")
                .build();
        em.persist(post);
        em.flush();
        return post;
    }

    private void insertWantToGo(Spot targetSpot, Post sourcePost) {
        em.createNativeQuery("""
                insert into want_to_go (user_id, spot_id, source_post_id)
                values (:user, :spot, :source)
                """)
                .setParameter("user", user.getId())
                .setParameter("spot", targetSpot.getId())
                .setParameter("source", sourcePost.getId())
                .executeUpdate();
        em.flush();
    }

    private int rowCount(String table) {
        Object count = em.createNativeQuery("select count(*) from " + table).getSingleResult();
        return ((Number) count).intValue();
    }
}
