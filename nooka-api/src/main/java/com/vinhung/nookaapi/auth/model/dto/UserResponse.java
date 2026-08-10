package com.vinhung.nookaapi.auth.model.dto;

import com.vinhung.nookaapi.user.entity.User;
import java.util.UUID;

public record UserResponse(UUID id, String email, String username, String displayName,
        String avatarUrl, boolean emailVerified) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getUsername(), user.getDisplayName(),
                user.getAvatarUrl(), user.isEmailVerified());
    }
}
