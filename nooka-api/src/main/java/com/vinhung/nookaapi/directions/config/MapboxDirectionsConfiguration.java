package com.vinhung.nookaapi.directions.config;

import com.vinhung.nookaapi.directions.integration.MapboxDirectionsProvider;
import com.vinhung.nookaapi.directions.service.DirectionsProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * Configuration for Mapbox Directions API.
 * Uses a dedicated RestClient to avoid conflicts with the Google provider.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(MapboxDirectionsProperties.class)
class MapboxDirectionsConfiguration {

    @Bean
    RestClient mapboxDirectionsRestClient(RestClient.Builder builder, MapboxDirectionsProperties properties) {
        return builder.baseUrl(properties.baseUrl()).build();
    }

    @Bean
    DirectionsProvider mapboxDirectionsProvider(
                                                 @Qualifier("mapboxDirectionsRestClient") RestClient mapboxDirectionsRestClient,
                                                 MapboxDirectionsProperties properties) {
        return new MapboxDirectionsProvider(mapboxDirectionsRestClient, properties);
    }
}
