package com.vinhung.nookaapi.tag.repository;

import com.vinhung.nookaapi.tag.api.TagCatalog;
import com.vinhung.nookaapi.tag.entity.Tag;
import jakarta.persistence.EntityManager;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
class JpaTagCatalog implements TagCatalog {

    private final EntityManager em;

    @Override
    public Map<UUID, String> slugsFor(Collection<UUID> tagIds) {
        if (tagIds.isEmpty()) {
            // `in ()` rỗng là lỗi cú pháp ở một số dialect và một lượt gọi
            // database thừa ở mọi dialect.
            return Map.of();
        }

        List<Tag> tags = em.createQuery("select t from Tag t where t.id in :ids", Tag.class)
                .setParameter("ids", tagIds)
                .getResultList();

        return tags.stream().collect(Collectors.toMap(Tag::getId, Tag::getSlug, (a, b) -> a));
    }
}
