package com.vinhung.nookaapi.directions.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for Mapbox Directions API.
 * Access token is server-only and must not be exposed to clients.
 */
@ConfigurationProperties("nooka.directions.mapbox")
public record MapboxDirectionsProperties(String accessToken, String baseUrl) {
}
