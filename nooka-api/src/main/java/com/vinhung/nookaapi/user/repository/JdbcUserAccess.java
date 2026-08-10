package com.vinhung.nookaapi.user.repository;

import com.vinhung.nookaapi.user.api.UserAccess;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class JdbcUserAccess implements UserAccess {

    private final JdbcClient jdbc;

    @Override
    public boolean isActive(UUID userId) {
        return jdbc.sql("select exists(select 1 from users where id = :id and deleted_at is null)")
                .param("id", userId)
                .query(Boolean.class)
                .single();
    }

    @Override
    public boolean areMutualFriends(UUID userId, List<UUID> friendIds) {
        if (friendIds.isEmpty()) {
            return true;
        }
        Long count = jdbc.sql("""
                select count(*)
                from users friend
                where friend.id in (:friendIds)
                  and friend.deleted_at is null
                  and exists (
                      select 1 from follows
                      where follower_id = :userId and followee_id = friend.id)
                  and exists (
                      select 1 from follows
                      where follower_id = friend.id and followee_id = :userId)
                """)
                .param("friendIds", friendIds)
                .param("userId", userId)
                .query(Long.class)
                .single();
        return count != null && count == friendIds.size();
    }
}
