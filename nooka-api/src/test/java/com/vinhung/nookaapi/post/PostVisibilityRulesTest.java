package com.vinhung.nookaapi.post;

import static org.assertj.core.api.Assertions.assertThat;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.post.api.PostAccess;
import com.vinhung.nookaapi.post.api.PostCardView;
import com.vinhung.nookaapi.post.entity.Post;
import com.vinhung.nookaapi.shared.model.Visibility;
import com.vinhung.nookaapi.spot.entity.Area;
import com.vinhung.nookaapi.spot.entity.City;
import com.vinhung.nookaapi.spot.entity.Place;
import com.vinhung.nookaapi.spot.entity.Spot;
import com.vinhung.nookaapi.user.entity.Block;
import com.vinhung.nookaapi.user.entity.CloseFriend;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

/**
 * R2 ở §20: "Spring Boot không có Row Level Security, nên bốn mức visibility ở
 * §13 phải được ép trong mọi truy vấn chạm tới Post. Đây là thành phần duy nhất
 * trong dự án cần viết test trước khi viết code."
 *
 * <p>Test chạy trên Postgres thật chứ không phải mock, vì thứ đang được kiểm là
 * một câu SQL. Một bộ mock sẽ xanh kể cả khi predicate sinh ra sai hoàn toàn.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class PostVisibilityRulesTest {

    @Autowired
    private EntityManager em;

    @Autowired
    private PostAccess postAccess;

    private User author;
    private User follower;
    private User closeFriend;
    private User stranger;
    private Spot spot;

    @BeforeEach
    void setUp() {
        author = persistUser("author");
        follower = persistUser("follower");
        closeFriend = persistUser("closefriend");
        stranger = persistUser("stranger");

        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        Area area = Area.builder().city(city).name("Binh Thanh").build();
        em.persist(area);
        spot = Place.builder().name("Quan ca phe").area(area).createdById(author.getId()).build();
        em.persist(spot);

        em.persist(Follow.builder()
                .followerId(follower.getId())
                .followeeId(author.getId())
                .build());
        em.persist(CloseFriend.builder()
                .ownerId(author.getId())
                .friendId(closeFriend.getId())
                .build());

        em.flush();
    }

    @Test
    @DisplayName("Bài Public hiện với người lạ")
    void publicPostIsVisibleToStranger() {
        Post post = persistPost(Visibility.PUBLIC);

        assertThat(visibleTo(stranger)).contains(post.getId());
    }

    @Test
    @DisplayName("Bài Public hiện cả với khách chưa đăng nhập")
    void publicPostIsVisibleToAnonymous() {
        Post post = persistPost(Visibility.PUBLIC);

        assertThat(visibleTo(null)).contains(post.getId());
    }

    @Test
    @DisplayName("Bài Private chỉ hiện với chính tác giả")
    void privatePostIsVisibleOnlyToAuthor() {
        Post post = persistPost(Visibility.PRIVATE);

        assertThat(visibleTo(author)).contains(post.getId());
        assertThat(visibleTo(follower)).doesNotContain(post.getId());
        assertThat(visibleTo(closeFriend)).doesNotContain(post.getId());
        assertThat(visibleTo(stranger)).doesNotContain(post.getId());
        assertThat(visibleTo(null)).doesNotContain(post.getId());
    }

    @Test
    @DisplayName("Bài Followers hiện với người đang follow")
    void followersPostIsVisibleToFollower() {
        Post post = persistPost(Visibility.FOLLOWERS);

        assertThat(visibleTo(follower)).contains(post.getId());
    }

    @Test
    @DisplayName("Bài Followers không hiện với người không follow")
    void followersPostIsHiddenFromNonFollower() {
        Post post = persistPost(Visibility.FOLLOWERS);

        assertThat(visibleTo(stranger)).doesNotContain(post.getId());
        assertThat(visibleTo(null)).doesNotContain(post.getId());
    }

    @Test
    @DisplayName("Follow ngược chiều không mở được bài Followers")
    void followInWrongDirectionDoesNotGrantAccess() {
        // Tác giả follow người lạ, nhưng người lạ không follow lại.
        em.persist(Follow.builder()
                .followerId(author.getId())
                .followeeId(stranger.getId())
                .build());
        em.flush();
        Post post = persistPost(Visibility.FOLLOWERS);

        assertThat(visibleTo(stranger)).doesNotContain(post.getId());
    }

    @Test
    @DisplayName("Bài Close Friends hiện với người trong danh sách của tác giả")
    void closeFriendsPostIsVisibleToCloseFriend() {
        Post post = persistPost(Visibility.CLOSE_FRIENDS);

        assertThat(visibleTo(closeFriend)).contains(post.getId());
    }

    @Test
    @DisplayName("Close Friends không phải tập con của Followers")
    void closeFriendsPostIsHiddenFromPlainFollower() {
        Post post = persistPost(Visibility.CLOSE_FRIENDS);

        // follower đang follow tác giả nhưng không nằm trong danh sách close
        // friends, nên không được xem.
        assertThat(visibleTo(follower)).doesNotContain(post.getId());
    }

    @Test
    @DisplayName("Danh sách close friends của người khác không mở được bài của tác giả")
    void closeFriendListOfAnotherUserGrantsNothing() {
        // Người lạ đưa tác giả vào danh sách của mình. Danh sách là một chiều,
        // nên điều đó không cho người lạ quyền xem bài của tác giả.
        em.persist(CloseFriend.builder()
                .ownerId(stranger.getId())
                .friendId(author.getId())
                .build());
        em.flush();
        Post post = persistPost(Visibility.CLOSE_FRIENDS);

        assertThat(visibleTo(stranger)).doesNotContain(post.getId());
    }

    @Test
    @DisplayName("Chặn thắng cả Public, theo cả hai chiều")
    void blockHidesEvenPublicPostsInBothDirections() {
        Post post = persistPost(Visibility.PUBLIC);

        em.persist(Block.builder()
                .blockerId(stranger.getId())
                .blockedId(author.getId())
                .build());
        em.flush();
        em.clear();

        // Người chặn không còn thấy bài Public của người bị chặn.
        assertThat(visibleTo(stranger)).doesNotContain(post.getId());
        // Nhưng lệnh chặn của người khác không được làm tác giả mất bài của
        // chính mình.
        assertThat(visibleTo(author)).contains(post.getId());
    }

    @Test
    @DisplayName("Người bị chặn không thấy bài của người đã chặn mình")
    void blockedUserCannotSeePostsOfBlocker() {
        User blocker = persistUser("blocker");
        em.persist(Block.builder()
                .blockerId(blocker.getId())
                .blockedId(stranger.getId())
                .build());
        Post post = persistPost(blocker, Visibility.PUBLIC);
        em.flush();
        em.clear();

        assertThat(visibleTo(stranger)).doesNotContain(post.getId());
    }

    @Test
    @DisplayName("Bài đã xoá mềm không hiện với bất kỳ ai, kể cả tác giả")
    void softDeletedPostIsInvisibleToEveryone() {
        Post post = persistPost(Visibility.PUBLIC);
        // persistPost kết thúc bằng em.clear(), nên `post` đã detached. Gọi
        // setter trên nó không sinh UPDATE nào và bài chưa bao giờ thật sự bị
        // xoá mềm — test sẽ đo nhầm. Phải lấy lại bản managed rồi mới sửa.
        em.find(Post.class, post.getId()).setDeletedAt(java.time.Instant.now());
        em.flush();
        em.clear();

        assertThat(visibleTo(author)).doesNotContain(post.getId());
        assertThat(visibleTo(stranger)).doesNotContain(post.getId());
    }

    @Test
    @DisplayName("R9: bài của tài khoản đã xoá biến mất với mọi người, kể cả chính tác giả")
    void postsOfDeletedAuthorAreInvisibleToEveryone() {
        Post post = persistPost(Visibility.PUBLIC);

        em.find(User.class, author.getId()).setDeletedAt(java.time.Instant.now());
        em.flush();
        em.clear();

        assertThat(visibleTo(author)).doesNotContain(post.getId());
        assertThat(visibleTo(follower)).doesNotContain(post.getId());
        assertThat(visibleTo(stranger)).doesNotContain(post.getId());
        // Nhánh khách chưa đăng nhập thoát sớm khỏi visibleTo, nên nó là chỗ
        // dễ quên áp R9 nhất — và là chỗ ai cũng chạm được.
        assertThat(visibleTo(null)).doesNotContain(post.getId());
    }

    @Test
    @DisplayName("R9: bỏ đánh dấu xoá thì bài hiện lại")
    void postsReappearWhenAuthorDeletionIsUndone() {
        Post post = persistPost(Visibility.PUBLIC);

        em.find(User.class, author.getId()).setDeletedAt(java.time.Instant.now());
        em.flush();
        em.clear();
        assertThat(visibleTo(stranger)).doesNotContain(post.getId());

        em.find(User.class, author.getId()).setDeletedAt(null);
        em.flush();
        em.clear();

        assertThat(visibleTo(stranger)).contains(post.getId());
    }

    @Test
    @DisplayName("R9: xoá tài khoản người khác không làm mất bài của tác giả")
    void deletingAnotherAccountDoesNotHideThisAuthorsPosts() {
        Post post = persistPost(Visibility.PUBLIC);

        em.find(User.class, stranger.getId()).setDeletedAt(java.time.Instant.now());
        em.flush();
        em.clear();

        assertThat(visibleTo(follower)).contains(post.getId());
    }

    // ---- fixtures -------------------------------------------------------

    private java.util.List<UUID> visibleTo(User viewer) {
        UUID viewerId = viewer == null ? null : viewer.getId();
        return postAccess.feedFor(viewerId, PageRequest.of(0, 100)).getContent().stream()
                .map(PostCardView::id)
                .toList();
    }

    private User persistUser(String username) {
        User user = User.builder()
                .email(username + "@example.test")
                .passwordHash("unused")
                .username(username)
                .displayName(username)
                .build();
        em.persist(user);
        return user;
    }

    private Post persistPost(Visibility visibility) {
        return persistPost(author, visibility);
    }

    private Post persistPost(User postAuthor, Visibility visibility) {
        Post post = Post.builder()
                .authorId(postAuthor.getId())
                .spotId(spot.getId())
                .visibility(visibility)
                .caption("cà phê ngon")
                .build();
        em.persist(post);
        em.flush();
        em.clear();
        return post;
    }
}
