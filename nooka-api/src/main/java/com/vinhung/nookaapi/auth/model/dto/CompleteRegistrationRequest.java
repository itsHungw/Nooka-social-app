package com.vinhung.nookaapi.auth.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CompleteRegistrationRequest(
        @NotBlank String registrationToken,
        @NotBlank @Size(max = 80) String displayName,
        @NotBlank @Size(min = 3, max = 30) String username) {
}
