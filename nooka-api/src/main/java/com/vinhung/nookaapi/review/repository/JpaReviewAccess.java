package com.vinhung.nookaapi.review.repository;

import com.vinhung.nookaapi.review.api.ReviewAccess;
import com.vinhung.nookaapi.shared.model.TagVote;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
class JpaReviewAccess implements ReviewAccess {

    private static final String COUNT_SQL = """
            select count(*) from reviews
            where spot_id = :spotId and deleted_at is null
            """;

    /**
     * Chỉ lấy đáp án có {@code grants_tag_id}; đáp án như "có ổ cắm: có" hữu ích
     * cho người đọc nhưng không sinh thẻ nào.
     */
    private static final String TAG_VOTES_SQL = """
            select o.grants_tag_id, r.author_id
            from review_answers a
            join reviews r on r.id = a.review_id
            join review_question_options o on o.id = a.option_id
            where r.spot_id = :spotId
              and r.deleted_at is null
              and o.grants_tag_id is not null
            """;

    private final EntityManager em;

    @Override
    public long countAtSpot(UUID spotId) {
        Object count = em.createNativeQuery(COUNT_SQL)
                .setParameter("spotId", spotId)
                .getSingleResult();
        return ((Number) count).longValue();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<TagVote> tagVotesAtSpot(UUID spotId) {
        List<Object[]> rows = em.createNativeQuery(TAG_VOTES_SQL)
                .setParameter("spotId", spotId)
                .getResultList();

        return rows.stream()
                .map(row -> new TagVote((UUID) row[0], (UUID) row[1]))
                .toList();
    }
}
