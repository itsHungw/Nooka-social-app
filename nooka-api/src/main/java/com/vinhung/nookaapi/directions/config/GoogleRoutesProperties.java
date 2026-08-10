package com.vinhung.nookaapi.directions.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("nooka.routes.google")
public record GoogleRoutesProperties(String apiKey, String baseUrl) {
}
