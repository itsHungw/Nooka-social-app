package com.vinhung.nookaapi.tag;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.tag.entity.Tag;
import com.vinhung.nookaapi.tag.model.enums.TagKind;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * TAG_IDS hiện là mảng cứng 10 phần tử trong features/nooka/spots.ts, nên thêm
 * một thẻ là sửa code cộng phát hành app. §12 nói moat số hai là "metadata có
 * cấu trúc từ lần đi thật", tức bộ thẻ sẽ còn mở rộng — nó phải là dữ liệu.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class TagCatalogTest {

    @Autowired
    private EntityManager em;

    @Test
    @DisplayName("Thẻ mới mặc định pickable và chưa lưu trữ")
    void newTagDefaults() {
        Tag tag = persistTag("quiet", TagKind.VIBE);
        em.clear();

        Tag reloaded = em.find(Tag.class, tag.getId());

        assertThat(reloaded.isPickable()).isTrue();
        assertThat(reloaded.getArchivedAt()).isNull();
        assertThat(reloaded.isActive()).isTrue();
        assertThat(reloaded.getSortOrder()).isZero();
    }

    @Test
    @DisplayName("Slug là duy nhất")
    void slugIsUnique() {
        persistTag("workFriendly", TagKind.FACILITY);

        assertThatThrownBy(() -> persistTag("workFriendly", TagKind.FACILITY))
                .hasMessageContaining("tags_slug_key");
    }

    @Test
    @DisplayName("Loại thẻ ngoài bốn giá trị cho phép bị từ chối")
    void unknownKindIsRejected() {
        assertThatThrownBy(() -> {
            em.createNativeQuery("insert into tags (slug, kind) values ('bogus', 'MOOD')")
                    .executeUpdate();
            em.flush();
        }).hasMessageContaining("tags_kind_check");
    }

    @Test
    @DisplayName("Thẻ lưu trữ vẫn còn trong bảng nhưng không còn active")
    void archivedTagIsKept() {
        Tag tag = persistTag("openLate", TagKind.VIBE);
        tag.setArchivedAt(Instant.now());
        em.flush();
        em.clear();

        Tag reloaded = em.find(Tag.class, tag.getId());

        assertThat(reloaded).isNotNull();
        assertThat(reloaded.isActive()).isFalse();
    }

    @Test
    @DisplayName("Nhãn và từ đồng nghĩa lưu theo từng ngôn ngữ")
    void translationsAreStoredPerLocale() {
        Tag tag = persistTag("niceView", TagKind.VIBE);
        insertTranslation(tag.getId(), "vi", "View đẹp", "{\"view đẹp\",\"cảnh đẹp\"}");
        insertTranslation(tag.getId(), "en", "Nice view", "{\"nice view\",\"good view\"}");

        Object viLabel = em.createNativeQuery(
                        "select label from tag_translations where tag_id = :id and locale = 'vi'")
                .setParameter("id", tag.getId())
                .getSingleResult();

        assertThat(viLabel).isEqualTo("View đẹp");
    }

    @Test
    @DisplayName("Từ đồng nghĩa tra ngược được về thẻ — đây là cái xếp hạng cần")
    void synonymsAreSearchable() {
        Tag quiet = persistTag("quiet", TagKind.VIBE);
        Tag late = persistTag("openLate", TagKind.VIBE);
        insertTranslation(quiet.getId(), "vi", "Yên tĩnh", "{\"yên\",\"yên tĩnh\",\"không ồn\"}");
        insertTranslation(late.getId(), "vi", "Mở muộn", "{\"mở muộn\",\"khuya\"}");

        @SuppressWarnings("unchecked")
        var matched = (java.util.List<UUID>) em.createNativeQuery("""
                select tag_id from tag_translations
                where locale = 'vi' and :word = any (synonyms)
                """)
                .setParameter("word", "không ồn")
                .getResultList();

        assertThat(matched).containsExactly(quiet.getId());
    }

    @Test
    @DisplayName("Một thẻ chỉ có một bản dịch cho mỗi ngôn ngữ")
    void oneTranslationPerLocale() {
        Tag tag = persistTag("fast", TagKind.FACILITY);
        insertTranslation(tag.getId(), "vi", "Nhanh", "{}");

        assertThatThrownBy(() -> insertTranslation(tag.getId(), "vi", "Ra nhanh", "{}"))
                .hasMessageContaining("tag_translations_pkey");
    }

    private Tag persistTag(String slug, TagKind kind) {
        Tag tag = Tag.builder().slug(slug).kind(kind).build();
        em.persist(tag);
        em.flush();
        return tag;
    }

    private void insertTranslation(UUID tagId, String locale, String label, String synonyms) {
        em.createNativeQuery("""
                insert into tag_translations (tag_id, locale, label, synonyms)
                values (:id, :locale, :label, cast(:synonyms as text[]))
                """)
                .setParameter("id", tagId)
                .setParameter("locale", locale)
                .setParameter("label", label)
                .setParameter("synonyms", synonyms)
                .executeUpdate();
        em.flush();
    }
}
