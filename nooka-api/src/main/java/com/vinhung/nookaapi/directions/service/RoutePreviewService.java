package com.vinhung.nookaapi.directions.service;

import com.vinhung.nookaapi.directions.cache.RoutePreviewCache;
import com.vinhung.nookaapi.directions.cache.RoutePreviewCacheKeyFactory;
import com.vinhung.nookaapi.directions.model.dto.RoutePreviewRequest;
import com.vinhung.nookaapi.directions.model.dto.RoutePreviewResponse;
import org.springframework.stereotype.Service;

@Service
public class RoutePreviewService {

    private final DirectionsProviderRegistry providerRegistry;
    private final RoutePreviewCache routePreviewCache;
    private final RoutePreviewCacheKeyFactory cacheKeyFactory;

    public RoutePreviewService(
            DirectionsProviderRegistry providerRegistry,
            RoutePreviewCache routePreviewCache,
            RoutePreviewCacheKeyFactory cacheKeyFactory) {
        this.providerRegistry = providerRegistry;
        this.routePreviewCache = routePreviewCache;
        this.cacheKeyFactory = cacheKeyFactory;
    }

    public RoutePreviewResponse preview(RoutePreviewRequest request) {
        var provider = providerRegistry.selected();
        var query = new DirectionsProvider.RouteQuery(
                coordinate(request.origin()),
                coordinate(request.destination()),
                request.mode());
        var cacheKey = cacheKeyFactory.create(provider.id(), query);

        return routePreviewCache.find(cacheKey).orElseGet(() -> {
            var route = provider.preview(query);
            var response = new RoutePreviewResponse(
                    route.distanceMeters(),
                    route.durationSeconds(),
                    route.encodedPolyline(),
                    request.mode());
            routePreviewCache.put(cacheKey, response);
            return response;
        });
    }

    private static DirectionsProvider.Coordinate coordinate(RoutePreviewRequest.Coordinate coordinate) {
        return new DirectionsProvider.Coordinate(coordinate.latitude(), coordinate.longitude());
    }
}