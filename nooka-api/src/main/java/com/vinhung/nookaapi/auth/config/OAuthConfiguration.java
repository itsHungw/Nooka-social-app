package com.vinhung.nookaapi.auth.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.web.client.RestClient;

@Configuration(proxyBeanMethods = false)
@RequiredArgsConstructor
class OAuthConfiguration {

    private final OAuthProperties properties;

    @Bean
    JwtDecoder googleJwtDecoder() {
        return oidcDecoder(
                "https://www.googleapis.com/oauth2/v3/certs",
                "https://accounts.google.com",
                properties.googleClientId());
    }

    @Bean
    JwtDecoder appleJwtDecoder() {
        return oidcDecoder(
                "https://appleid.apple.com/auth/keys",
                "https://appleid.apple.com",
                properties.appleClientId());
    }

    @Bean
    RestClient facebookRestClient(RestClient.Builder builder) {
        String baseUrl = properties.facebook() == null ? "https://graph.facebook.com"
                : properties.facebook().graphBaseUrl();
        return builder
                .baseUrl(baseUrl)
                .requestFactory(new JdkClientHttpRequestFactory())
                .build();
    }

    private JwtDecoder oidcDecoder(String jwkSetUri, String issuer, String audience) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        OAuth2TokenValidator<Jwt> issuerValidator = JwtValidators.createDefaultWithIssuer(issuer);
        decoder.setJwtValidator(new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(
                issuerValidator, audienceValidator(audience)));
        return decoder;
    }

    private OAuth2TokenValidator<Jwt> audienceValidator(String expectedAudience) {
        return jwt -> expectedAudience != null && !expectedAudience.isBlank()
                && jwt.getAudience().contains(expectedAudience)
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error(
                        "invalid_token", "Token audience is not configured for Nooka", null));
    }
}
