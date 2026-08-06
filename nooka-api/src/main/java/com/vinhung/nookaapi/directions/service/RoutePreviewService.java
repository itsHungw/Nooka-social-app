package com.vinhung.nookaapi.directions.service;

import com.vinhung.nookaapi.directions.model.dto.RoutePreviewRequest;
import com.vinhung.nookaapi.directions.model.dto.RoutePreviewResponse;
import org.springframework.stereotype.Service;

@Service
public class RoutePreviewService {

    private final DirectionsProviderRegistry providerRegistry;

    public RoutePreviewService(DirectionsProviderRegistry providerRegistry) {
        this.providerRegistry = providerRegistry;
    }

    public RoutePreviewResponse preview(RoutePreviewRequest request) {
        var route = providerRegistry.selected().preview(new DirectionsProvider.RouteQuery(
                coordinate(request.origin()),
                coordinate(request.destination()),
                request.mode()));
        return new RoutePreviewResponse(
                route.distanceMeters(),
                route.durationSeconds(),
                route.encodedPolyline(),
                request.mode());
    }

    private static DirectionsProvider.Coordinate coordinate(RoutePreviewRequest.Coordinate coordinate) {
        return new DirectionsProvider.Coordinate(coordinate.latitude(), coordinate.longitude());
    }
}
