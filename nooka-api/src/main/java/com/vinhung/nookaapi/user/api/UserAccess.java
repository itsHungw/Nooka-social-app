package com.vinhung.nookaapi.user.api;

import java.util.List;
import java.util.UUID;

/** Minimal cross-module account state boundary. */
public interface UserAccess {
    boolean isActive(UUID userId);

    boolean areMutualFriends(UUID userId, List<UUID> friendIds);
}
