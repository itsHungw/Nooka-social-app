package com.vinhung.nookaapi.directions.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("nooka.directions")
public record DirectionsProperties(String provider) {
}
