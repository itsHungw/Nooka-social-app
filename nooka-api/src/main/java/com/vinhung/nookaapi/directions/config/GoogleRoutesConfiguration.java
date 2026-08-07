package com.vinhung.nookaapi.directions.config;

import com.vinhung.nookaapi.directions.integration.GoogleRoutesProvider;
import com.vinhung.nookaapi.directions.service.DirectionsProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.client.RestClient;

/**
 * Configuration for Google Routes API fallback.
 * Uses a dedicated RestClient with "google" qualifier to avoid conflicts with Mapbox.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(GoogleRoutesProperties.class)
class GoogleRoutesConfiguration {

    @Bean
    RestClient googleDirectionsRestClient(RestClient.Builder builder, GoogleRoutesProperties properties) {
        return builder.baseUrl(properties.baseUrl()).build();
    }

    @Bean
    DirectionsProvider googleRoutesProvider(
                                            @Qualifier("googleDirectionsRestClient") RestClient googleDirectionsRestClient,
                                            GoogleRoutesProperties properties) {
        return new GoogleRoutesProvider(googleDirectionsRestClient, properties);
    }
}
