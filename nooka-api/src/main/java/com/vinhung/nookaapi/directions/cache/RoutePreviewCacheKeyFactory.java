package com.vinhung.nookaapi.directions.cache;

import com.vinhung.nookaapi.directions.config.RouteCacheProperties;
import com.vinhung.nookaapi.directions.service.DirectionsProvider;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class RoutePreviewCacheKeyFactory {

    private final RouteCacheProperties properties;

    public RoutePreviewCacheKeyFactory(RouteCacheProperties properties) {
        this.properties = properties;
    }

    public RoutePreviewCacheKey create(String providerId, DirectionsProvider.RouteQuery query) {
        return new RoutePreviewCacheKey(
                providerId.trim().toLowerCase(Locale.ROOT),
                query.mode(),
                bucket(query.origin().latitude(), properties.originGridDecimals()),
                bucket(query.origin().longitude(), properties.originGridDecimals()),
                bucket(query.destination().latitude(), properties.destinationGridDecimals()),
                bucket(query.destination().longitude(), properties.destinationGridDecimals()));
    }

    private static long bucket(double coordinate, int decimalPlaces) {
        return Math.round(coordinate * Math.pow(10, decimalPlaces));
    }
}