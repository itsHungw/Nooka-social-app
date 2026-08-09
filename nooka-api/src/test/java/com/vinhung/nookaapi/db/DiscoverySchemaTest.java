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

/**
 * Bảng của giai đoạn 3 chưa có entity JPA: service ghi vào chúng thuộc phần
 * "Hỏi Nooka", chưa nằm trong phạm vi thiết kế database. Thứ cần chứng minh bây
 * giờ là constraint đang bật và mắt xích đo north-star đã nối được.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class DiscoverySchemaTest {

    @Autowired
    private EntityManager em;

    private User owner;
    private Spot spot;

    @BeforeEach
    void setUp() {
        owner = persistUser("seeker");

        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        Area area = Area.builder().city(city).name("District 3").build();
        em.persist(area);
        spot = Place.builder().name("Bloom").area(area).createdById(owner.getId()).build();
        em.persist(spot);
        em.flush();
    }

    @Test
    @DisplayName("Selection tạm và selection đã lưu phân biệt bằng saved_at")
    void temporaryAndSavedSelections() {
        UUID temporary = insertSelection("chỗ nào yên để làm việc", null);
        UUID saved = insertSelection("chỗ hẹn hò tối nay", "now()");

        Object savedCount = em.createNativeQuery(
                        "select count(*) from selections where owner_id = :o and saved_at is not null")
                .setParameter("o", owner.getId())
                .getSingleResult();

        assertThat(((Number) savedCount).intValue()).isEqualTo(1);
        assertThat(temporary).isNotEqualTo(saved);
    }

    @Test
    @DisplayName("Hai quán không thể cùng một thứ hạng trong một selection")
    void rankIsUniqueWithinASelection() {
        UUID selection = insertSelection("cà phê yên", null);
        insertItem(selection, spot.getId(), 1);

        Spot second = persistPlace("Muoi 43");

        assertThatThrownBy(() -> insertItem(selection, second.getId(), 1))
                .hasMessageContaining("selection_items_rank_key");
    }

    @Test
    @DisplayName("Mảng thẻ khớp và thẻ lý do lưu và đọc lại được")
    void tagArraysRoundTrip() {
        UUID selection = insertSelection("yên và mở muộn", null);
        UUID tagA = UUID.randomUUID();
        UUID tagB = UUID.randomUUID();

        em.createNativeQuery("""
                update selections set matched_tag_ids = array[:a, :b]::uuid[] where id = :id
                """)
                .setParameter("a", tagA)
                .setParameter("b", tagB)
                .setParameter("id", selection)
                .executeUpdate();
        em.flush();

        Object count = em.createNativeQuery("""
                select cardinality(matched_tag_ids) from selections where id = :id
                """)
                .setParameter("id", selection)
                .getSingleResult();

        assertThat(((Number) count).intValue()).isEqualTo(2);
    }

    @Test
    @DisplayName("North-star: nối được một lượt hỏi với bài đăng follow-up sau đó")
    void northStarLinkIsMeasurable() {
        UUID selection = insertSelection("chỗ làm việc yên", "now()");
        insertItem(selection, spot.getId(), 1);

        Post post = Post.builder()
                .authorId(owner.getId())
                .spotId(spot.getId())
                .visibility(Visibility.PUBLIC)
                .caption("đi thật rồi")
                .build();
        em.persist(post);
        em.flush();

        em.createNativeQuery("update posts set from_selection_id = :s where id = :p")
                .setParameter("s", selection)
                .setParameter("p", post.getId())
                .executeUpdate();
        em.flush();

        // Đây chính là phép đo §15: lượt hỏi nào dẫn tới một chuyến đi thật.
        Object converted = em.createNativeQuery("""
                select count(distinct s.id)
                from selections s
                join selection_items si on si.selection_id = s.id
                join posts p on p.from_selection_id = s.id and p.spot_id = si.spot_id
                where s.owner_id = :owner
                """)
                .setParameter("owner", owner.getId())
                .getSingleResult();

        assertThat(((Number) converted).intValue()).isEqualTo(1);
    }

    @Test
    @DisplayName("Xoá selection không xoá bài viết đã trỏ vào nó")
    void deletingSelectionKeepsThePost() {
        UUID selection = insertSelection("tạm", null);
        Post post = Post.builder()
                .authorId(owner.getId())
                .spotId(spot.getId())
                .visibility(Visibility.PUBLIC)
                .caption("giữ lại")
                .build();
        em.persist(post);
        em.flush();
        em.createNativeQuery("update posts set from_selection_id = :s where id = :p")
                .setParameter("s", selection)
                .setParameter("p", post.getId())
                .executeUpdate();
        em.flush();

        em.createNativeQuery("delete from selections where id = :id")
                .setParameter("id", selection)
                .executeUpdate();
        em.flush();
        em.clear();

        assertThat(em.find(Post.class, post.getId())).isNotNull();
    }

    @Test
    @DisplayName("Link kiểu SELECTION bắt buộc trỏ vào một selection")
    void selectionLinkMustPointAtASelection() {
        assertThatThrownBy(() -> insertLink("tok-a", "SELECTION", null, "PUBLIC"))
                .hasMessageContaining("shared_links_selection_check");
    }

    @Test
    @DisplayName("Link kiểu PROFILE_MAP không được trỏ vào selection")
    void profileMapLinkMustNotPointAtASelection() {
        UUID selection = insertSelection("x", null);

        assertThatThrownBy(() -> insertLink("tok-b", "PROFILE_MAP", selection, "PUBLIC"))
                .hasMessageContaining("shared_links_selection_check");
    }

    @Test
    @DisplayName("Ba mức riêng tư của link khớp màn share-map")
    void threeVisibilityLevelsAreAccepted() {
        insertLink("tok-public", "PROFILE_MAP", null, "PUBLIC");
        insertLink("tok-followers", "PROFILE_MAP", null, "FOLLOWERS");
        insertLink("tok-private", "PROFILE_MAP", null, "PRIVATE");

        Object count = em.createNativeQuery(
                        "select count(*) from shared_links where owner_id = :o")
                .setParameter("o", owner.getId())
                .getSingleResult();

        assertThat(((Number) count).intValue()).isEqualTo(3);
    }

    @Test
    @DisplayName("Mức riêng tư ngoài ba giá trị cho phép bị từ chối")
    void unknownVisibilityIsRejected() {
        assertThatThrownBy(() -> insertLink("tok-bad", "PROFILE_MAP", null, "SECRET"))
                .hasMessageContaining("shared_links_visibility_check");
    }

    @Test
    @DisplayName("Token của link là duy nhất")
    void tokenIsUnique() {
        insertLink("tok-dup", "PROFILE_MAP", null, "PUBLIC");

        assertThatThrownBy(() -> insertLink("tok-dup", "PROFILE_MAP", null, "PUBLIC"))
                .hasMessageContaining("shared_links_token_key");
    }

    @Test
    @DisplayName("Topic do hệ thống tạo có created_by rỗng, và bản dịch theo ngôn ngữ")
    void systemTopicAndTranslations() {
        UUID topic = UUID.randomUUID();
        em.createNativeQuery("""
                insert into topics (id, slug, published_at) values (:id, 'quiet-cafes-d1', now())
                """)
                .setParameter("id", topic)
                .executeUpdate();
        em.createNativeQuery("""
                insert into topic_translations (topic_id, locale, title)
                values (:id, 'vi', 'Quán yên ở Quận 1')
                """)
                .setParameter("id", topic)
                .executeUpdate();
        em.createNativeQuery("insert into topic_spots (topic_id, spot_id) values (:t, :s)")
                .setParameter("t", topic)
                .setParameter("s", spot.getId())
                .executeUpdate();
        em.flush();

        Object title = em.createNativeQuery("""
                select title from topic_translations where topic_id = :id and locale = 'vi'
                """)
                .setParameter("id", topic)
                .getSingleResult();

        assertThat(title).isEqualTo("Quán yên ở Quận 1");
    }

    // ---- fixtures --------------------------------------------------------

    private UUID insertSelection(String query, String savedAtExpression) {
        UUID id = UUID.randomUUID();
        String savedAt = savedAtExpression == null ? "null" : savedAtExpression;
        em.createNativeQuery("""
                insert into selections (id, owner_id, query_text, saved_at)
                values (:id, :owner, :query, %s)
                """.formatted(savedAt))
                .setParameter("id", id)
                .setParameter("owner", owner.getId())
                .setParameter("query", query)
                .executeUpdate();
        em.flush();
        return id;
    }

    private void insertItem(UUID selectionId, UUID spotId, int rank) {
        em.createNativeQuery("""
                insert into selection_items (selection_id, spot_id, rank) values (:s, :p, :r)
                """)
                .setParameter("s", selectionId)
                .setParameter("p", spotId)
                .setParameter("r", rank)
                .executeUpdate();
        em.flush();
    }

    private void insertLink(String token, String kind, UUID selectionId, String visibility) {
        em.createNativeQuery("""
                insert into shared_links (token, owner_id, kind, selection_id, visibility)
                values (:token, :owner, :kind, :selection, :visibility)
                """)
                .setParameter("token", token)
                .setParameter("owner", owner.getId())
                .setParameter("kind", kind)
                .setParameter("selection", selectionId)
                .setParameter("visibility", visibility)
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

    private Spot persistPlace(String name) {
        Spot place = Place.builder()
                .name(name)
                .area(em.find(Place.class, spot.getId()).getArea())
                .createdById(owner.getId())
                .build();
        em.persist(place);
        em.flush();
        return place;
    }
}
