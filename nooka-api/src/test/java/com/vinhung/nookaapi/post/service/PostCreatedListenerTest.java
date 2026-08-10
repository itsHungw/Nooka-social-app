package com.vinhung.nookaapi.post.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.post.api.PostCreated;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.locks.LockSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class PostCreatedListenerTest {

    @Autowired
    private JdbcClient jdbc;

    @Autowired
    private ApplicationEventPublisher events;

    @Autowired
    private TransactionTemplate transactions;

    @Test
    void eventuallyRecordsBeenOnceWhenEventIsDeliveredAgain() {
        UUID authorId = UUID.randomUUID();
        UUID cityId = UUID.randomUUID();
        UUID areaId = UUID.randomUUID();
        UUID spotId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        seed(authorId, cityId, areaId, spotId, postId);
        PostCreated event = new PostCreated(UUID.randomUUID(), postId, authorId, spotId);

        transactions.executeWithoutResult(status -> events.publishEvent(event));
        transactions.executeWithoutResult(status -> events.publishEvent(event));

        awaitBeen(authorId, spotId);
        Integer count = jdbc.sql("""
                select count(*) from been where user_id = :userId and spot_id = :spotId
                """).param("userId", authorId).param("spotId", spotId)
                .query(Integer.class).single();
        UUID firstPostId = jdbc.sql("""
                select first_post_id from been where user_id = :userId and spot_id = :spotId
                """).param("userId", authorId).param("spotId", spotId)
                .query(UUID.class).single();

        assertThat(count).isEqualTo(1);
        assertThat(firstPostId).isEqualTo(postId);
    }

    private void awaitBeen(UUID userId, UUID spotId) {
        long deadline = System.nanoTime() + Duration.ofSeconds(5).toNanos();
        while (System.nanoTime() < deadline) {
            Boolean exists = jdbc.sql("""
                    select exists(select 1 from been where user_id = :userId and spot_id = :spotId)
                    """).param("userId", userId).param("spotId", spotId)
                    .query(Boolean.class).single();
            if (exists) {
                return;
            }
            LockSupport.parkNanos(Duration.ofMillis(25).toNanos());
        }
        throw new AssertionError("Been projection was not created within 5 seconds");
    }

    private void seed(UUID userId, UUID cityId, UUID areaId, UUID spotId, UUID postId) {
        jdbc.sql("""
                insert into users(id, email, password_hash, username, display_name)
                values (:id, :email, 'unused', :username, :username)
                """).param("id", userId).param("email", userId + "@example.test")
                .param("username", "u" + userId.toString().replace("-", "")).update();
        jdbc.sql("insert into cities(id, name, country_code) values (:id, 'HCMC', 'VN')")
                .param("id", cityId).update();
        jdbc.sql("insert into areas(id, city_id, name) values (:id, :cityId, 'District 3')")
                .param("id", areaId).param("cityId", cityId).update();
        jdbc.sql("""
                insert into spots(id, kind, name, area_id, created_by)
                values (:id, 'PLACE', 'Event spot', :areaId, :userId)
                """).param("id", spotId).param("areaId", areaId).param("userId", userId).update();
        jdbc.sql("insert into places(spot_id) values (:spotId)")
                .param("spotId", spotId).update();
        jdbc.sql("""
                insert into posts(id, author_id, spot_id, visibility, hide_time)
                values (:id, :userId, :spotId, 'PRIVATE', true)
                """).param("id", postId).param("userId", userId).param("spotId", spotId).update();
    }
}
