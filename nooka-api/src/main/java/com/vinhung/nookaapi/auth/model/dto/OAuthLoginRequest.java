package com.vinhung.nookaapi.auth.model.dto;

import jakarta.validation.constraints.NotBlank;

public record OAuthLoginRequest(@NotBlank String token) {
}
