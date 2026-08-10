package com.vinhung.nookaapi.post.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.media.api.MediaService;
import com.vinhung.nookaapi.media.api.StoredImage;
import com.vinhung.nookaapi.post.api.PostCreated;
import com.vinhung.nookaapi.post.model.dto.CreateCheckInRequest;
import com.vinhung.nookaapi.post.model.dto.MediaCropRequest;
import com.vinhung.nookaapi.shared.model.Visibility;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@RecordApplicationEvents
class CreateCheckInServiceTest {

    @Autowired
    private CreateCheckInService service;

    @Autowired
    private JdbcClient jdbc;

    @Autowired
    private ApplicationEvents events;

    @MockitoBean
    private MediaService mediaService;

    private UUID authorId;
    private UUID spotId;

    @BeforeEach
    void setUp() {
        authorId = UUID.randomUUID();
        UUID cityId = UUID.randomUUID();
        UUID areaId = UUID.randomUUID();
        spotId = UUID.randomUUID();
        UUID sourcePostId = UUID.randomUUID();

        jdbc.sql("""
                insert into users(id, email, password_hash, username, display_name)
                values (:id, :email, 'unused', :username, :username)
                """).param("id", authorId)
                .param("email", authorId + "@example.test")
                .param("username", "u" + authorId.toString().replace("-", ""))
                .update();
        jdbc.sql("insert into cities(id, name, country_code) values (:id, 'HCMC', 'VN')")
                .param("id", cityId).update();
        jdbc.sql("insert into areas(id, city_id, name) values (:id, :cityId, 'District 1')")
                .param("id", areaId).param("cityId", cityId).update();
        jdbc.sql("""
                insert into spots(id, kind, name, area_id, created_by)
                values (:id, 'PLACE', 'Test spot', :areaId, :authorId)
                """).param("id", spotId).param("areaId", areaId)
                .param("authorId", authorId).update();
        jdbc.sql("insert into places(spot_id) values (:spotId)")
                .param("spotId", spotId).update();
        jdbc.sql("""
                insert into posts(id, author_id, spot_id, visibility, hide_time)
                values (:id, :authorId, :spotId, 'PUBLIC', true)
                """).param("id", sourcePostId).param("authorId", authorId)
                .param("spotId", spotId).update();
        jdbc.sql("""
                insert into want_to_go(user_id, spot_id, source_post_id)
                values (:authorId, :spotId, :sourcePostId)
                """).param("authorId", authorId).param("spotId", spotId)
                .param("sourcePostId", sourcePostId).update();
    }

    @Test
    void publishesOneIdempotentCheckInWithOrderedPrivateMedia() {
        given(mediaService.sanitizeAndStore(any())).willReturn(
                new StoredImage("check-ins/safe.jpg", "image/jpeg", 123,
                        "abc123", 1200, 900));
        UUID key = UUID.randomUUID();
        var request = new CreateCheckInRequest(
                spotId, Visibility.PUBLIC, " Great coffee ", null, null,
                null, null, null, List.of("Cà Phê", "cà phê", "Quiet"), null,
                List.of(new MediaCropRequest(1.4, 0.25, -0.5)));
        var photo = new MockMultipartFile(
                "photos", "live-photo-still.jpg", "image/jpeg", new byte[] {1});

        var first = service.create(authorId, key, request, List.of(photo));
        var retried = service.create(authorId, key, request, List.of(photo));

        assertThat(first.publicId()).isNotNull().isEqualTo(retried.publicId());
        assertThat(first.visitTimeVisible()).isFalse();
        assertThat(first.wantToGoPresent()).isTrue();
        assertThat(retried.wantToGoPresent()).isTrue();
        assertThat(first.media()).singleElement().satisfies(media -> {
            assertThat(media.position()).isZero();
            assertThat(media.url()).startsWith("/v1/posts/" + first.publicId() + "/media/");
            assertThat(media.cropZoom()).isEqualTo(1.4);
            assertThat(media.cropOffsetX()).isEqualTo(0.25);
            assertThat(media.cropOffsetY()).isEqualTo(-0.5);
        });
        assertThat(events.stream(PostCreated.class).toList()).hasSize(1);
        verify(mediaService, times(1)).sanitizeAndStore(any());
    }

    @Test
    void publishesToSelectedMutualFriendsOnly() {
        UUID friendId = UUID.randomUUID();
        jdbc.sql("""
                insert into users(id, email, password_hash, username, display_name)
                values (:id, :email, 'unused', :username, :username)
                """).param("id", friendId)
                .param("email", friendId + "@example.test")
                .param("username", "u" + friendId.toString().replace("-", ""))
                .update();
        jdbc.sql("""
                insert into follows(follower_id, followee_id)
                values (:authorId, :friendId), (:friendId, :authorId)
                """).param("authorId", authorId).param("friendId", friendId).update();
        given(mediaService.sanitizeAndStore(any())).willReturn(
                new StoredImage("check-ins/selected.jpg", "image/jpeg", 123,
                        "selected123", 1200, 1500));
        var request = new CreateCheckInRequest(
                spotId, Visibility.SELECTED_FRIENDS, null, null, null,
                null, null, null, List.of(), List.of(friendId), null);
        var photo = new MockMultipartFile(
                "photos", "selected.jpg", "image/jpeg", new byte[] {1});

        var response = service.create(
                authorId, UUID.randomUUID(), request, List.of(photo));

        assertThat(response.visibility()).isEqualTo("SELECTED_FRIENDS");
        assertThat(response.audienceUserIds()).containsExactly(friendId);
    }
}
