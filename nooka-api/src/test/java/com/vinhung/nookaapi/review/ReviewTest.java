package com.vinhung.nookaapi.review;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.review.api.ReviewAccess;
import com.vinhung.nookaapi.review.entity.Review;
import com.vinhung.nookaapi.review.entity.ReviewAnswer;
import com.vinhung.nookaapi.review.entity.ReviewQuestion;
import com.vinhung.nookaapi.review.entity.ReviewQuestionOption;
import com.vinhung.nookaapi.shared.model.TagVote;
import com.vinhung.nookaapi.spot.entity.Area;
import com.vinhung.nookaapi.spot.entity.City;
import com.vinhung.nookaapi.spot.entity.Place;
import com.vinhung.nookaapi.spot.entity.Spot;
import com.vinhung.nookaapi.tag.entity.Tag;
import com.vinhung.nookaapi.tag.model.enums.TagKind;
import com.vinhung.nookaapi.user.entity.User;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * Luật "đáp án nào sinh thẻ nào" hiện nằm cứng trong mobile:
 *
 * <pre>
 * if (reviewAnswers.stay === 'no')     earned.push('workFriendly');
 * if (reviewAnswers.price === 'cheap') earned.push('goodPrice');
 * </pre>
 *
 * <p>Test này chứng minh nó đã thành dữ liệu: thêm một luật mới là một INSERT.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class ReviewTest {

    @Autowired
    private EntityManager em;

    @Autowired
    private ReviewAccess reviewAccess;

    private Spot spot;
    private User author;
    private Tag workFriendly;
    private Tag goodPrice;
    private ReviewQuestion stayQuestion;
    private ReviewQuestionOption stayNo;
    private ReviewQuestionOption stayYes;

    @BeforeEach
    void setUp() {
        author = persistUser("reviewer");

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

        workFriendly = persistTag("workFriendly", TagKind.FACILITY);
        goodPrice = persistTag("goodPrice", TagKind.PRICE);

        stayQuestion = ReviewQuestion.builder().slug("stay").sortOrder(1).build();
        em.persist(stayQuestion);

        // "Do they nudge you to leave?" — trả lời KHÔNG thì quán hợp để ngồi làm.
        stayNo = ReviewQuestionOption.builder()
                .questionId(stayQuestion.getId())
                .value("no")
                .grantsTagId(workFriendly.getId())
                .build();
        em.persist(stayNo);

        // Trả lời CÓ thì không sinh thẻ nào — không phải đáp án nào cũng sinh thẻ.
        stayYes = ReviewQuestionOption.builder()
                .questionId(stayQuestion.getId())
                .value("yes")
                .build();
        em.persist(stayYes);

        em.flush();
    }

    @Test
    @DisplayName("Đáp án có grants_tag_id sinh ra một phiếu thẻ")
    void answerWithGrantsTagProducesAVote() {
        Review review = persistReview(author, "Góc trái yên nhất.");
        persistAnswer(review, stayQuestion, stayNo);

        List<TagVote> votes = reviewAccess.tagVotesAtSpot(spot.getId());

        assertThat(votes).containsExactly(new TagVote(workFriendly.getId(), author.getId()));
    }

    @Test
    @DisplayName("Đáp án không có grants_tag_id thì không sinh phiếu nào")
    void answerWithoutGrantsTagProducesNoVote() {
        Review review = persistReview(author, "Bị nhắc liên tục.");
        persistAnswer(review, stayQuestion, stayYes);

        assertThat(reviewAccess.tagVotesAtSpot(spot.getId())).isEmpty();
    }

    @Test
    @DisplayName("Thêm luật sinh thẻ mới chỉ là một INSERT, không phải đổi code")
    void addingANewRuleIsJustAnInsert() {
        ReviewQuestion priceQuestion = ReviewQuestion.builder().slug("price").sortOrder(2).build();
        em.persist(priceQuestion);
        ReviewQuestionOption cheap = ReviewQuestionOption.builder()
                .questionId(priceQuestion.getId())
                .value("cheap")
                .grantsTagId(goodPrice.getId())
                .build();
        em.persist(cheap);
        em.flush();

        Review review = persistReview(author, "Rẻ và yên.");
        persistAnswer(review, stayQuestion, stayNo);
        persistAnswer(review, priceQuestion, cheap);

        assertThat(reviewAccess.tagVotesAtSpot(spot.getId()))
                .containsExactlyInAnyOrder(
                        new TagVote(workFriendly.getId(), author.getId()),
                        new TagVote(goodPrice.getId(), author.getId()));
    }

    @Test
    @DisplayName("Một người chỉ có một review cho mỗi quán")
    void oneReviewPerAuthorPerSpot() {
        persistReview(author, "Lần đầu.");

        assertThatThrownBy(() -> persistReview(author, "Viết chồng."))
                .hasMessageContaining("reviews_author_spot_key");
    }

    @Test
    @DisplayName("Review đã xoá mềm thì viết lại được, và không còn được đếm")
    void softDeletedReviewFreesTheSlotAndStopsCounting() {
        Review first = persistReview(author, "Sẽ xoá.");
        em.find(Review.class, first.getId()).setDeletedAt(Instant.now());
        em.flush();

        assertThat(reviewAccess.countAtSpot(spot.getId())).isZero();

        persistReview(author, "Viết lại sau khi xoá.");

        assertThat(reviewAccess.countAtSpot(spot.getId())).isEqualTo(1);
    }

    @Test
    @DisplayName("Body dài quá 500 ký tự bị từ chối")
    void tooLongBodyIsRejected() {
        assertThatThrownBy(() -> persistReview(author, "x".repeat(501)))
                .hasMessageContaining("reviews_body_length");
    }

    @Test
    @DisplayName("Một câu hỏi chỉ được trả lời một lần trong một review")
    void oneAnswerPerQuestionPerReview() {
        Review review = persistReview(author, "Một lần thôi.");
        persistAnswer(review, stayQuestion, stayNo);

        // Chèn bằng SQL thô chứ không qua em.persist: Hibernate thấy khoá kép
        // đã nằm trong persistence context nên bỏ qua lần persist thứ hai, và
        // câu INSERT không bao giờ chạm database. Test khi đó đo hành vi của
        // session chứ không đo constraint — đúng thứ cần chứng minh ở đây.
        assertThatThrownBy(() -> {
            em.createNativeQuery("""
                    insert into review_answers (review_id, question_id, option_id)
                    values (:review, :question, :option)
                    """)
                    .setParameter("review", review.getId())
                    .setParameter("question", stayQuestion.getId())
                    .setParameter("option", stayYes.getId())
                    .executeUpdate();
            em.flush();
        }).hasMessageContaining("review_answers_pkey");
    }

    @Test
    @DisplayName("Đáp án phải thuộc đúng câu hỏi được trả lời")
    void answerOptionMustBelongToTheQuestion() {
        ReviewQuestion priceQuestion = ReviewQuestion.builder().slug("price-mismatch").sortOrder(2).build();
        em.persist(priceQuestion);
        ReviewQuestionOption cheap = ReviewQuestionOption.builder()
                .questionId(priceQuestion.getId())
                .value("cheap")
                .build();
        em.persist(cheap);
        em.flush();

        Review review = persistReview(author, "Không được ghép sai câu hỏi.");

        assertThatThrownBy(() -> persistAnswer(review, stayQuestion, cheap))
                .hasMessageContaining("review_answers_question_option_fkey");
    }

    @Test
    @DisplayName("Hai người trả lời cùng đáp án thì thành hai phiếu")
    void twoPeopleProduceTwoVotes() {
        User second = persistUser("secondreviewer");
        persistAnswer(persistReview(author, "A"), stayQuestion, stayNo);
        persistAnswer(persistReview(second, "B"), stayQuestion, stayNo);

        assertThat(reviewAccess.tagVotesAtSpot(spot.getId()))
                .containsExactlyInAnyOrder(
                        new TagVote(workFriendly.getId(), author.getId()),
                        new TagVote(workFriendly.getId(), second.getId()));
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

    private Tag persistTag(String slug, TagKind kind) {
        Tag tag = Tag.builder().slug(slug).kind(kind).build();
        em.persist(tag);
        return tag;
    }

    private Review persistReview(User reviewAuthor, String body) {
        Review review = Review.builder()
                .spotId(spot.getId())
                .authorId(reviewAuthor.getId())
                .body(body)
                .build();
        em.persist(review);
        em.flush();
        return review;
    }

    private void persistAnswer(Review review, ReviewQuestion question, ReviewQuestionOption option) {
        em.persist(ReviewAnswer.builder()
                .reviewId(review.getId())
                .questionId(question.getId())
                .optionId(option.getId())
                .build());
        em.flush();
    }
}
