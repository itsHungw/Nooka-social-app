package com.vinhung.nookaapi.spot.service;

import com.vinhung.nookaapi.spot.api.SpotVisitRecorder;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class JdbcSpotVisitRecorder implements SpotVisitRecorder {

    private final JdbcClient jdbc;

    @Override
    public void recordBeen(UUID userId, UUID spotId, UUID firstPostId) {
        jdbc.sql("""
                insert into been(user_id, spot_id, first_post_id)
                values (:userId, :spotId, :firstPostId)
                on conflict (user_id, spot_id) do nothing
                """)
                .param("userId", userId)
                .param("spotId", spotId)
                .param("firstPostId", firstPostId)
                .update();
    }
}
