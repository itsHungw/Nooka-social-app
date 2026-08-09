package com.vinhung.nookaapi.insight;

import static org.assertj.core.api.Assertions.assertThat;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.insight.api.SpotStats;
import com.vinhung.nookaapi.insight.api.SpotStatsView;
import com.vinhung.nookaapi.insight.api.TagStat;
import com.vinhung.nookaapi.post.entity.Post;
import com.vinhung.nookaapi.review.entity.Review;
import com.vinhung.nookaapi.review.entity.ReviewAnswer;
import com.vinhung.nookaapi.review.entity.ReviewQuestion;
import com.vinhung.nookaapi.review.entity.ReviewQuestionOption;
import com.vinhung.nookaapi.shared.model.Visibility;
import com.vinhung.nookaapi.spot.entity.Area;
import com.vinhung.nookaapi.spot.entity.City;
import com.vinhung.nookaapi.spot.entity.Place;
import com.vinhung.nookaapi.spot.entity.Spot;
import com.vinhung.nookaapi.tag.entity.Tag;
import com.vinhung.nookaapi.tag.model.enums.TagKind;
import com.vinhung.nookaapi.user.entity.Follow;
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
 * Hai luật của mục 13 trong spec, và cả hai đều rò dữ liệu mà KHÔNG báo lỗi:
 *
 * <p><b>R3a</b> — số liệu phụ thuộc người xem phải đi qua {@code PostAccess}.
 * §8 chốt {@code Been} tự động bật khi đăng bài, kể cả bài {@code PRIVATE}. Nếu
 * "3 người bạn đã tới đây" đếm thẳng bảng {@code been} thì một bài riêng tư làm
 * con số đó nhích lên và bạn bè biết mình vừa ở đâu — bài họ không đọc được,
 * nhưng con số đã kể xong câu chuyện.
 *
 * <p><b>R3b</b> — số liệu toàn cục đếm theo tầng cố định {@code PUBLIC} +
 * {@code FOLLOWERS}, không bao giờ đếm {@code CLOSE_FRIENDS} hay
 * {@code PRIVATE}, và không phụ thuộc người xem để còn cache được.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class SpotStatsTest {

    @Autowired
    private EntityManager em;

    @Autowired
    private SpotStats spotStats;

    private Spot spot;
    private User author;
    private User follower;
    private User stranger;
    private Tag quiet;

    @BeforeEach
    void setUp() {
        author = persistUser("statsauthor");
        follower = persistUser("statsfollower");
        stranger = persistUser("statsstranger");

        // follower theo dõi author; author KHÔNG theo dõi ngược lại.
        em.persist(Follow.builder()
                .followerId(follower.getId())
                .followeeId(author.getId())
                .build());

        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        Area area = Area.builder().city(city).name("District 1").build();
        em.persist(area);
        spot = Place.builder()
                .name("The Workshop Coffee")
                .area(area)
                .createdById(author.getId())
                .build();
        em.persist(spot);

        quiet = Tag.builder().slug("quiet").kind(TagKind.VIBE).build();
        em.persist(quiet);
        em.flush();
    }

    // ---- R3b: số liệu toàn cục ------------------------------------------

    @Test
    @DisplayName("R3b: bài PUBLIC và FOLLOWERS đều được đếm vào số check-in")
    void publicAndFollowersPostsAreCounted() {
        persistPost(author, Visibility.PUBLIC);
        persistPost(persistUser("second"), Visibility.FOLLOWERS);

        assertThat(stats(stranger).checkinCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("R3b: bài CLOSE_FRIENDS và PRIVATE không bao giờ được đếm")
    void closeFriendsAndPrivatePostsAreNeverCounted() {
        persistPost(author, Visibility.CLOSE_FRIENDS);
        persistPost(persistUser("secret"), Visibility.PRIVATE);

        // Kể cả chính tác giả cũng thấy con số toàn cục là 0 — nó không phụ
        // thuộc người xem, đó là điều kiện để sau này cache được.
        assertThat(stats(author).checkinCount()).isZero();
        assertThat(stats(stranger).checkinCount()).isZero();
    }

    @Test
    @DisplayName("R3b: số check-in giống nhau với mọi người xem, kể cả khách")
    void globalCountDoesNotDependOnViewer() {
        persistPost(author, Visibility.PUBLIC);
        persistPost(author, Visibility.FOLLOWERS);

        assertThat(stats(author).checkinCount()).isEqualTo(2);
        assertThat(stats(follower).checkinCount()).isEqualTo(2);
        assertThat(stats(stranger).checkinCount()).isEqualTo(2);
        assertThat(stats(null).checkinCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("R9 vẫn áp: bài của tài khoản đã xoá không vào số liệu toàn cục")
    void postsOfDeletedAuthorsAreNotCounted() {
        persistPost(author, Visibility.PUBLIC);
        assertThat(stats(stranger).checkinCount()).isEqualTo(1);

        em.find(User.class, author.getId()).setDeletedAt(java.time.Instant.now());
        em.flush();
        em.clear();

        assertThat(stats(stranger).checkinCount()).isZero();
    }

    // ---- R3a: số liệu phụ thuộc người xem --------------------------------

    @Test
    @DisplayName("R3a: bài PRIVATE KHÔNG làm tăng số bạn bè đã tới")
    void privatePostDoesNotLeakThroughFriendCount() {
        persistPost(author, Visibility.PRIVATE);

        // follower đang theo dõi author. Nếu con số này là 1 thì follower vừa
        // biết author đã tới quán, dù không đọc được bài.
        assertThat(stats(follower).friendCount()).isZero();
    }

    @Test
    @DisplayName("R3a: bài FOLLOWERS làm tăng số bạn bè đã tới, đúng người theo dõi")
    void followersPostCountsForTheFollower() {
        persistPost(author, Visibility.FOLLOWERS);

        assertThat(stats(follower).friendCount()).isEqualTo(1);
        // stranger không theo dõi author nên không thấy gì.
        assertThat(stats(stranger).friendCount()).isZero();
    }

    @Test
    @DisplayName("R3a: đếm theo người, không theo bài")
    void friendCountCountsPeopleNotPosts() {
        persistPost(author, Visibility.PUBLIC);
        persistPost(author, Visibility.PUBLIC);
        persistPost(author, Visibility.PUBLIC);

        assertThat(stats(follower).friendCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("R3a: khách chưa đăng nhập luôn thấy 0 bạn bè")
    void anonymousViewerHasNoFriends() {
        persistPost(author, Visibility.PUBLIC);

        assertThat(stats(null).friendCount()).isZero();
    }

    @Test
    @DisplayName("R3a: block chặn cả con số, không chỉ chặn nội dung")
    void blockAlsoHidesTheNumber() {
        persistPost(author, Visibility.PUBLIC);
        em.persist(com.vinhung.nookaapi.user.entity.Block.builder()
                .blockerId(author.getId())
                .blockedId(follower.getId())
                .build());
        em.flush();
        em.clear();

        assertThat(stats(follower).friendCount()).isZero();
    }

    // ---- Đếm thẻ ---------------------------------------------------------

    @Test
    @DisplayName("Một người gắn thẻ trên bài VÀ trả lời review sinh cùng thẻ vẫn là một người")
    void sameUserVotingTwiceCountsOnce() {
        Post post = persistPost(author, Visibility.PUBLIC);
        tagPost(post, quiet);
        grantTagViaReview(author, quiet);

        assertThat(stats(stranger).tags())
                .extracting(TagStat::slug, TagStat::people)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("quiet", 1L));
    }

    @Test
    @DisplayName("Hai người nói cùng một thẻ thì đếm thành hai")
    void twoPeopleCountAsTwo() {
        User other = persistUser("othertagger");
        tagPost(persistPost(author, Visibility.PUBLIC), quiet);
        tagPost(persistPost(other, Visibility.PUBLIC), quiet);

        assertThat(stats(stranger).tags())
                .extracting(TagStat::people)
                .containsExactly(2L);
    }

    @Test
    @DisplayName("Thẻ trên bài PRIVATE không vào thống kê thẻ")
    void tagsOnPrivatePostsAreNotCounted() {
        tagPost(persistPost(author, Visibility.PRIVATE), quiet);

        assertThat(stats(stranger).tags()).isEmpty();
    }

    // ---- Cờ suy ra -------------------------------------------------------

    @Test
    @DisplayName("isNew và hasReview suy ra từ số liệu, không phải cột trong bảng")
    void derivedFlags() {
        SpotStatsView empty = stats(stranger);
        assertThat(empty.isNew()).isTrue();
        assertThat(empty.hasReview()).isFalse();

        persistPost(author, Visibility.PUBLIC);
        persistPost(persistUser("thirdvisitor"), Visibility.PUBLIC);
        persistReview(author);

        SpotStatsView busy = stats(stranger);
        assertThat(busy.isNew()).isFalse();
        assertThat(busy.hasReview()).isTrue();
        assertThat(busy.reviewCount()).isEqualTo(1);
    }

    // ---- fixtures --------------------------------------------------------

    private SpotStatsView stats(User viewer) {
        return spotStats.forViewer(spot.getId(), viewer == null ? null : viewer.getId());
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

    private Post persistPost(User postAuthor, Visibility visibility) {
        Post post = Post.builder()
                .authorId(postAuthor.getId())
                .spotId(spot.getId())
                .visibility(visibility)
                .caption("ca phe")
                .build();
        em.persist(post);
        em.flush();
        return post;
    }

    private void tagPost(Post post, Tag tag) {
        em.createNativeQuery("insert into post_vibe_tags (post_id, tag_id) values (:post, :tag)")
                .setParameter("post", post.getId())
                .setParameter("tag", tag.getId())
                .executeUpdate();
        em.flush();
    }

    private Review persistReview(User reviewAuthor) {
        Review review = Review.builder()
                .spotId(spot.getId())
                .authorId(reviewAuthor.getId())
                .body("mot dong cho nguoi sau")
                .build();
        em.persist(review);
        em.flush();
        return review;
    }

    private void grantTagViaReview(User reviewAuthor, Tag tag) {
        ReviewQuestion question = ReviewQuestion.builder()
                .slug("stay-" + UUID.randomUUID())
                .build();
        em.persist(question);
        ReviewQuestionOption option = ReviewQuestionOption.builder()
                .questionId(question.getId())
                .value("no")
                .grantsTagId(tag.getId())
                .build();
        em.persist(option);

        Review review = persistReview(reviewAuthor);
        em.persist(ReviewAnswer.builder()
                .reviewId(review.getId())
                .questionId(question.getId())
                .optionId(option.getId())
                .build());
        em.flush();
    }
}
