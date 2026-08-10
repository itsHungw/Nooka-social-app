package com.vinhung.nookaapi.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("nooka.auth.oauth")
public record OAuthProperties(String googleClientId, String appleClientId, Facebook facebook) {

    public record Facebook(String appId, String appSecret, String graphBaseUrl) {
    }
}
