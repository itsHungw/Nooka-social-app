package com.vinhung.nookaapi.post.repository;

import com.vinhung.nookaapi.post.api.PostAccess;
import com.vinhung.nookaapi.post.api.PostCardView;
import com.vinhung.nookaapi.post.api.PostDetailView;
import com.vinhung.nookaapi.post.entity.Post;
import com.vinhung.nookaapi.shared.model.TagVote;
import com.vinhung.nookaapi.user.query.RelationshipCriteria;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
class JpaPostAccess implements PostAccess {

    private final PostRepository repository;
    private final PostVisibilityRules visibilityRules;
    private final RelationshipCriteria relationships;
    private final EntityManager em;

    @Override
    public Slice<PostCardView> feedFor(@Nullable UUID viewerId, Pageable pageable) {
        return repository.findAll(visibilityRules.visibleTo(viewerId), pageable)
                .map(post -> new PostCardView(post.getId()));
    }

    @Override
    public Optional<PostDetailView> detail(UUID postId, @Nullable UUID viewerId) {
        return repository.findOne(visibilityRules.visibleTo(viewerId).and(hasId(postId)))
                .map(post -> new PostDetailView(post.getId()));
    }

    @Override
    public long countFollowedAuthorsAtSpot(UUID spotId, @Nullable UUID viewerId) {
        if (viewerId == null) {
            return 0;
        }

        CriteriaBuilder builder = em.getCriteriaBuilder();
        CriteriaQuery<Long> query = builder.createQuery(Long.class);
        Root<Post> root = query.from(Post.class);

        // Dùng lại đúng predicate của luật visibility thay vì viết lại điều kiện
        // trong câu này. Viết lại là tạo bản sao thứ hai của luật riêng tư, và
        // bản sao sẽ lệch ngay lần đầu ai đó sửa một trong hai.
        Predicate visible = visibilityRules.visibleTo(viewerId).toPredicate(root, query, builder);
        Predicate sameSpot = builder.equal(root.get("spotId"), spotId);
        Predicate followed = builder.exists(
                relationships.followExists(query, builder, viewerId, root.get("authorId")));

        query.select(builder.countDistinct(root.get("authorId")))
                .where(builder.and(visible, sameSpot, followed));

        return em.createQuery(query).getSingleResult();
    }

    @Override
    public long countSharedAtSpot(UUID spotId) {
        Object count = em.createNativeQuery(COUNT_SHARED_SQL)
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

    private static Specification<Post> hasId(UUID postId) {
        return (root, query, builder) -> builder.equal(root.get("id"), postId);
    }

    /**
     * Tầng visibility cố định của R3b, viết thẳng vào SQL thay vì nhận tham số.
     *
     * <p>Bài của tài khoản đã xoá cũng bị loại, cùng luật R9 với
     * {@code PostVisibilityRules}. Hai chỗ diễn đạt cùng một ý bằng hai cách
     * khác nhau là một rủi ro có thật; test giữ cho chúng khớp nhau.
     */
    private static final String SHARED_VISIBILITY_FILTER = """
            p.deleted_at is null
              and p.visibility in ('PUBLIC', 'FOLLOWERS')
              and not exists (select 1 from users u
                              where u.id = p.author_id and u.deleted_at is not null)
            """;

    private static final String COUNT_SHARED_SQL =
            "select count(*) from posts p where p.spot_id = :spotId and " + SHARED_VISIBILITY_FILTER;

    private static final String TAG_VOTES_SQL = """
            select pvt.tag_id, p.author_id
            from post_vibe_tags pvt
            join posts p on p.id = pvt.post_id
            where p.spot_id = :spotId and
            """ + SHARED_VISIBILITY_FILTER;
}
