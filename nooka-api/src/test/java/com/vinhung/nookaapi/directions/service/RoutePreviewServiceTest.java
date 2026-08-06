package com.vinhung.nookaapi.directions.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.vinhung.nookaapi.directions.config.DirectionsProperties;
import com.vinhung.nookaapi.directions.model.dto.RoutePreviewRequest;
import com.vinhung.nookaapi.directions.model.enums.TravelMode;
import java.util.List;
import org.junit.jupiter.api.Test;

class RoutePreviewServiceTest {

    @Test
    void delegatesToTheConfiguredProviderWithoutKnowingItsImplementation() {
        var provider = new StubDirectionsProvider();
        var registry = new DirectionsProviderRegistry(List.of(provider), new DirectionsProperties("stub"));
        var service = new RoutePreviewService(registry);
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

    private static final class StubDirectionsProvider implements DirectionsProvider {

        private DirectionsProvider.RouteQuery lastQuery;

        @Override
        public String id() {
            return "stub";
        }

        @Override
        public DirectionsProvider.RouteData preview(DirectionsProvider.RouteQuery query) {
            lastQuery = query;
            return new DirectionsProvider.RouteData(120L, 90L, "encoded-route");
        }
    }
}
