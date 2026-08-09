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
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * §10 liệt inbox đầy đủ là ngoài phạm vi bản đầu, nên giai đoạn này đứng cuối.
 *
 * <p>Hai thứ đáng chứng minh: biệt danh và ảnh nền nằm ở bảng thành viên chứ
 * không ở cuộc trò chuyện (đặt nhầm là hai người dùng chung một biệt danh), và
 * danh sách hội thoại sắp được theo tin mới nhất mà không cần cột
 * {@code last_message_at}.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class MessagingSchemaTest {

    @Autowired
    private EntityManager em;

    private User me;
    private User linh;
    private Spot spot;

    @BeforeEach
    void setUp() {
        me = persistUser("chatme");
        linh = persistUser("chatlinh");

        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        Area area = Area.builder().city(city).name("District 1").build();
        em.persist(area);
        spot = Place.builder().name("Bloom").area(area).createdById(me.getId()).build();
        em.persist(spot);
        em.flush();
    }

    @Test
    @DisplayName("Biệt danh là của riêng từng người, không dùng chung")
    void nicknameIsPerMemberNotPerConversation() {
        UUID conversation = insertConversation();
        joinWithNickname(conversation, me, "Linh cà phê");
        joinWithNickname(conversation, linh, "Đức");

        Object myNickname = em.createNativeQuery("""
                select nickname from conversation_members
                where conversation_id = :c and user_id = :u
                """)
                .setParameter("c", conversation)
                .setParameter("u", me.getId())
                .getSingleResult();

        assertThat(myNickname).isEqualTo("Linh cà phê");
    }

    @Test
    @DisplayName("Người lạ nhắn thì nằm ở mục Requests cho tới khi được chấp nhận")
    void strangerMessageLandsInRequests() {
        UUID conversation = insertConversation();
        join(conversation, linh);
        join(conversation, me);   // accepted_at rỗng = còn là request

        Object pending = em.createNativeQuery("""
                select count(*) from conversation_members
                where user_id = :u and accepted_at is null and left_at is null
                """)
                .setParameter("u", me.getId())
                .getSingleResult();
        assertThat(((Number) pending).intValue()).isEqualTo(1);

        em.createNativeQuery("""
                update conversation_members set accepted_at = now()
                where conversation_id = :c and user_id = :u
                """)
                .setParameter("c", conversation)
                .setParameter("u", me.getId())
                .executeUpdate();
        em.flush();

        Object stillPending = em.createNativeQuery("""
                select count(*) from conversation_members
                where user_id = :u and accepted_at is null and left_at is null
                """)
                .setParameter("u", me.getId())
                .getSingleResult();
        assertThat(((Number) stillPending).intValue()).isZero();
    }

    @Test
    @DisplayName("Tin nhắn TEXT bắt buộc có nội dung")
    void textMessageNeedsABody() {
        UUID conversation = insertConversation();

        assertThatThrownBy(() -> insertMessage(conversation, linh, "TEXT", null, null, null))
                .hasMessageContaining("messages_text_check");
    }

    @Test
    @DisplayName("Tin nhắn SPOT bắt buộc có địa điểm")
    void spotMessageNeedsASpot() {
        UUID conversation = insertConversation();

        assertThatThrownBy(() -> insertMessage(conversation, linh, "SPOT", null, null, null))
                .hasMessageContaining("messages_spot_check");
    }

    @Test
    @DisplayName("Loại tin nhắn ngoài bốn giá trị cho phép bị từ chối")
    void unknownMessageKindIsRejected() {
        UUID conversation = insertConversation();

        assertThatThrownBy(() ->
                insertMessage(conversation, linh, "VOICE", "a", null, null))
                .hasMessageContaining("messages_kind_check");
    }

    @Test
    @DisplayName("Thẻ địa điểm gửi vào chat lưu được")
    void spotCardIsStored() {
        UUID conversation = insertConversation();
        insertMessage(conversation, linh, "SPOT", null, spot.getId(), null);

        Object count = em.createNativeQuery("""
                select count(*) from messages where conversation_id = :c and kind = 'SPOT'
                """)
                .setParameter("c", conversation)
                .getSingleResult();

        assertThat(((Number) count).intValue()).isEqualTo(1);
    }

    @Test
    @DisplayName("Lời mời gắn vào một địa điểm và có vòng đời riêng")
    void inviteHasItsOwnLifecycle() {
        UUID conversation = insertConversation();
        UUID message = insertMessage(conversation, linh, "INVITE", "Thứ sáu 7 giờ nhé?", null, null);

        em.createNativeQuery("""
                insert into message_invites (message_id, spot_id, proposed_at)
                values (:m, :s, now())
                """)
                .setParameter("m", message)
                .setParameter("s", spot.getId())
                .executeUpdate();
        em.flush();

        Object status = em.createNativeQuery(
                        "select status from message_invites where message_id = :m")
                .setParameter("m", message)
                .getSingleResult();
        assertThat(status).isEqualTo("PENDING");

        em.createNativeQuery("""
                update message_invites set status = 'ACCEPTED', responded_at = now()
                where message_id = :m
                """)
                .setParameter("m", message)
                .executeUpdate();
        em.flush();

        Object accepted = em.createNativeQuery(
                        "select status from message_invites where message_id = :m")
                .setParameter("m", message)
                .getSingleResult();
        assertThat(accepted).isEqualTo("ACCEPTED");
    }

    @Test
    @DisplayName("Xoá tin nhắn thì lời mời đi theo")
    void deletingMessageRemovesTheInvite() {
        UUID conversation = insertConversation();
        UUID message = insertMessage(conversation, linh, "INVITE", "đi không?", null, null);
        em.createNativeQuery("""
                insert into message_invites (message_id, spot_id) values (:m, :s)
                """)
                .setParameter("m", message)
                .setParameter("s", spot.getId())
                .executeUpdate();
        em.flush();

        em.createNativeQuery("delete from messages where id = :m")
                .setParameter("m", message)
                .executeUpdate();
        em.flush();

        Object left = em.createNativeQuery("select count(*) from message_invites")
                .getSingleResult();
        assertThat(((Number) left).intValue()).isZero();
    }

    @Test
    @DisplayName("Danh sách hội thoại sắp theo tin mới nhất mà không cần cột last_message_at")
    void conversationListSortsWithoutADenormalizedColumn() {
        UUID older = insertConversation();
        UUID newer = insertConversation();
        join(older, me);
        join(newer, me);

        insertMessage(older, linh, "TEXT", "tin cũ", null, null);
        insertMessage(newer, linh, "TEXT", "tin mới", null, null);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
                select c.id, m.body
                from conversations c
                join conversation_members cm on cm.conversation_id = c.id
                                            and cm.user_id = :me and cm.left_at is null
                cross join lateral (
                    select body, created_at from messages
                    where conversation_id = c.id and deleted_at is null
                    order by created_at desc limit 1
                ) m
                order by m.created_at desc
                """)
                .setParameter("me", me.getId())
                .getResultList();

        assertThat(rows).hasSize(2);
        assertThat(rows.get(0)[0]).isEqualTo(newer);
        assertThat(rows.get(0)[1]).isEqualTo("tin mới");
        assertThat(rows.get(1)[0]).isEqualTo(older);
    }

    @Test
    @DisplayName("Số tin chưa đọc suy ra từ last_read_at, không cần bảng riêng")
    void unreadCountComesFromLastReadAt() {
        UUID conversation = insertConversation();
        join(conversation, me);
        insertMessage(conversation, linh, "TEXT", "một", null, null);

        em.createNativeQuery("""
                update conversation_members set last_read_at = clock_timestamp()
                where conversation_id = :c and user_id = :u
                """)
                .setParameter("c", conversation)
                .setParameter("u", me.getId())
                .executeUpdate();
        em.flush();

        insertMessage(conversation, linh, "TEXT", "hai", null, null);
        insertMessage(conversation, linh, "TEXT", "ba", null, null);

        Object unread = em.createNativeQuery("""
                select count(*) from messages m
                join conversation_members cm on cm.conversation_id = m.conversation_id
                where m.conversation_id = :c and cm.user_id = :u
                  and m.deleted_at is null and m.sender_id <> :u
                  and (cm.last_read_at is null or m.created_at > cm.last_read_at)
                """)
                .setParameter("c", conversation)
                .setParameter("u", me.getId())
                .getSingleResult();

        assertThat(((Number) unread).intValue()).isEqualTo(2);
    }

    // ---- fixtures --------------------------------------------------------

    private UUID insertConversation() {
        UUID id = UUID.randomUUID();
        em.createNativeQuery("""
                insert into conversations (id, created_by) values (:id, :by)
                """)
                .setParameter("id", id)
                .setParameter("by", linh.getId())
                .executeUpdate();
        em.flush();
        return id;
    }

    private void join(UUID conversationId, User user) {
        joinWithNickname(conversationId, user, null);
    }

    private void joinWithNickname(UUID conversationId, User user, String nickname) {
        em.createNativeQuery("""
                insert into conversation_members (conversation_id, user_id, nickname)
                values (:c, :u, :n)
                """)
                .setParameter("c", conversationId)
                .setParameter("u", user.getId())
                .setParameter("n", nickname)
                .executeUpdate();
        em.flush();
    }

    private UUID insertMessage(
            UUID conversationId, User sender, String kind, String body, UUID spotId, UUID postId) {
        UUID id = UUID.randomUUID();
        // clock_timestamp() chứ không phải now(): now() trả về thời điểm bắt đầu
        // TRANSACTION, nên mọi tin nhắn chèn trong cùng một test sẽ có created_at
        // giống hệt nhau và mọi phép sắp theo thời gian trở thành tuỳ tiện.
        em.createNativeQuery("""
                insert into messages
                    (id, conversation_id, sender_id, kind, body, spot_id, post_id, created_at)
                values (:id, :c, :s, :kind, :body, :spot, :post, clock_timestamp())
                """)
                .setParameter("id", id)
                .setParameter("c", conversationId)
                .setParameter("s", sender.getId())
                .setParameter("kind", kind)
                .setParameter("body", body)
                .setParameter("spot", spotId)
                .setParameter("post", postId)
                .executeUpdate();
        em.flush();
        return id;
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
