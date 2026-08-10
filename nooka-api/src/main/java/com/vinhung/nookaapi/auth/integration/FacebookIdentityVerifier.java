package com.vinhung.nookaapi.auth.integration;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.vinhung.nookaapi.auth.config.OAuthProperties;
import com.vinhung.nookaapi.auth.model.enums.OAuthProvider;
import com.vinhung.nookaapi.shared.error.AuthException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
@RequiredArgsConstructor
class FacebookIdentityVerifier implements OAuthIdentityVerifier {

    private final RestClient facebookRestClient;
    private final OAuthProperties properties;

    @Override
    public OAuthProvider provider() {
        return OAuthProvider.FACEBOOK;
    }

    @Override
    public OAuthIdentity verify(String token) {
        OAuthProperties.Facebook facebook = properties.facebook();
        if (facebook == null || isBlank(facebook.appId()) || isBlank(facebook.appSecret())) {
            throw new AuthException(HttpStatus.SERVICE_UNAVAILABLE, "Facebook authentication is not configured");
        }
        try {
            FacebookDebugResponse debug = facebookRestClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/debug_token")
                            .queryParam("input_token", token)
                            .queryParam("access_token", facebook.appId() + "|" + facebook.appSecret())
                            .build())
                    .retrieve()
                    .body(FacebookDebugResponse.class);
            if (debug == null || debug.data() == null || !debug.data().isValid()
                    || !facebook.appId().equals(debug.data().appId())) {
                throw new AuthException(HttpStatus.UNAUTHORIZED, "Facebook authentication failed");
            }

            FacebookProfile profile = facebookRestClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/me")
                            .queryParam("fields", "id,email,name")
                            .queryParam("access_token", token)
                            .build())
                    .retrieve()
                    .body(FacebookProfile.class);
            if (profile == null || isBlank(profile.id())) {
                throw new AuthException(HttpStatus.UNAUTHORIZED, "Facebook authentication failed");
            }
            return new OAuthIdentity(profile.id(), profile.email(), !isBlank(profile.email()), profile.name());
        } catch (RestClientException exception) {
            throw new AuthException(HttpStatus.BAD_GATEWAY, "Facebook authentication is unavailable");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record FacebookDebugResponse(FacebookDebugData data) {
    }

    private record FacebookDebugData(
            @JsonProperty("is_valid") boolean isValid,
            @JsonProperty("app_id") String appId) {
    }

    private record FacebookProfile(String id, String email, String name) {
    }
}
