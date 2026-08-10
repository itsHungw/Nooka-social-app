package com.vinhung.nookaapi.spot.repository;

import com.vinhung.nookaapi.spot.api.CheckInSpot;
import com.vinhung.nookaapi.spot.api.SpotAccess;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class JdbcSpotAccess implements SpotAccess {

    private final JdbcClient jdbc;

    @Override
    public Optional<CheckInSpot> resolveForCheckIn(UUID spotId, UUID userId) {
        return jdbc.sql("""
                select s.id, w.source_post_id, (w.user_id is not null) as want_to_go_present
                from spots s
                left join want_to_go w on w.spot_id = s.id and w.user_id = :userId
                where s.id = :spotId and s.merged_into_id is null
                """)
                .param("spotId", spotId)
                .param("userId", userId)
                .query((rs, rowNum) -> new CheckInSpot(
                        rs.getObject("id", UUID.class),
                        rs.getObject("source_post_id", UUID.class),
                        rs.getBoolean("want_to_go_present")))
                .optional();
    }
}
