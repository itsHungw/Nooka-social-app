package com.vinhung.nookaapi.directions.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.vinhung.nookaapi.directions.cache.RoutePreviewCache;
import com.vinhung.nookaapi.directions.cache.RoutePreviewCacheKey;
import com.vinhung.nookaapi.directions.cache.RoutePreviewCacheKeyFactory;
import com.vinhung.nookaapi.directions.config.DirectionsProperties;
import com.vinhung.nookaapi.directions.config.RouteCacheProperties;
import com.vinhung.nookaapi.directions.model.dto.RoutePreviewRequest;
import com.vinhung.nookaapi.directions.model.dto.RoutePreviewResponse;
import com.vinhung.nookaapi.directions.model.enums.TravelMode;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class RoutePreviewServiceTest {

    @Test
    void delegatesToTheConfiguredProviderWithoutKnowingItsImplementation() {
        var provider = new StubDirectionsProvider();
        var registry = new DirectionsProviderRegistry(List.of(provider), new DirectionsProperties("stub"));
        var service = service(registry, new InMemoryRoutePreviewCache());
        var request = new RoutePreviewRequest(
                new RoutePreviewRequest.Coordinate(10.7769, 106.7009),
                new RoutePreviewRequest.Coordinate(10.7806, 106.6990),
                TravelMode.WALK);

        var response = service.preview(request);

        assertEquals(120L, response.distanceMeters());
        assertEquals(90L, response.durationSeconds());
        assertEquals("encoded-route", response.encodedPolyline());
        assertEquals(request.mode(), response.mode());
        assertEquals(
                new DirectionsProvider.RouteQuery(
                        new DirectionsProvider.Coordinate(10.7769, 106.7009),
                        new DirectionsProvider.Coordinate(10.7806, 106.6990),
                        TravelMode.WALK),
                provider.lastQuery);
    }

    @Test
    void reusesAStoredPreviewWithoutCallingTheProviderAgain() {
        var provider = new StubDirectionsProvider();
        var registry = new DirectionsProviderRegistry(List.of(provider), new DirectionsProperties("stub"));
        var service = service(registry, new InMemoryRoutePreviewCache());
        var request = new RoutePreviewRequest(
                new RoutePreviewRequest.Coordinate(10.7769, 106.7009),
                new RoutePreviewRequest.Coordinate(10.7806, 106.6990),
                TravelMode.DRIVE);

        var firstResponse = service.preview(request);
        var secondResponse = service.preview(request);

        assertEquals(firstResponse, secondResponse);
        assertEquals(1, provider.invocationCount);
    }

    private static RoutePreviewService service(
            DirectionsProviderRegistry registry,
            RoutePreviewCache cache) {
        var properties = new RouteCacheProperties(true, Duration.ofMinutes(15), "test:route", 3, 5);
        return new RoutePreviewService(registry, cache, new RoutePreviewCacheKeyFactory(properties));
    }

    private static final class InMemoryRoutePreviewCache implements RoutePreviewCache {

        private final Map<RoutePreviewCacheKey, RoutePreviewResponse> values = new HashMap<>();

        @Override
        public Optional<RoutePreviewResponse> find(RoutePreviewCacheKey key) {
            return Optional.ofNullable(values.get(key));
        }

        @Override
        public void put(RoutePreviewCacheKey key, RoutePreviewResponse response) {
            values.put(key, response);
        }
    }

    private static final class StubDirectionsProvider implements DirectionsProvider {

        private DirectionsProvider.RouteQuery lastQuery;
        private int invocationCount;

        @Override
        public String id() {
            return "stub";
        }

        @Override
        public DirectionsProvider.RouteData preview(DirectionsProvider.RouteQuery query) {
            lastQuery = query;
            invocationCount++;
            return new DirectionsProvider.RouteData(120L, 90L, "encoded-route");
        }
    }
}