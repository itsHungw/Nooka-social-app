package com.vinhung.nookaapi.directions.config;

import com.vinhung.nookaapi.directions.integration.GoogleRoutesProvider;
import com.vinhung.nookaapi.directions.service.DirectionsProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(GoogleRoutesProperties.class)
class GoogleRoutesConfiguration {

    @Bean
    RestClient googleRoutesRestClient(RestClient.Builder builder, GoogleRoutesProperties properties) {
        return builder.baseUrl(properties.baseUrl()).build();
    }

    @Bean
    DirectionsProvider googleRoutesProvider(RestClient restClient, GoogleRoutesProperties properties) {
        return new GoogleRoutesProvider(restClient, properties);
    }
}
