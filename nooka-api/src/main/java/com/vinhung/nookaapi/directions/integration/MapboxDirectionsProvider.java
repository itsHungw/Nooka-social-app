package com.vinhung.nookaapi.directions.integration;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.vinhung.nookaapi.directions.config.MapboxDirectionsProperties;
import com.vinhung.nookaapi.directions.model.enums.TravelMode;
import com.vinhung.nookaapi.directions.service.DirectionsProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

/**
 * Mapbox Directions API v5 provider for non-traffic route previews.
 * Uses driving and walking profiles (no live traffic).
 */
public class MapboxDirectionsProvider implements DirectionsProvider {

    private static final String PROFILE_DRIVING = "driving";
    private static final String PROFILE_WALKING = "walking";

    private final RestClient restClient;
    private final MapboxDirectionsProperties properties;

    public MapboxDirectionsProvider(RestClient restClient, MapboxDirectionsProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    @Override
    public String id() {
        return "mapbox";
    }

    @Override
    public RouteData preview(RouteQuery query) {
        if (properties.accessToken() == null || properties.accessToken().isBlank()) {
            throw unavailable("Directions provider is not configured", null);
        }

        String profile = query.mode() == TravelMode.DRIVE ? PROFILE_DRIVING : PROFILE_WALKING;
        // Mapbox uses longitude,latitude format
        String coordinates = formatCoordinates(query.origin()) + ";" + formatCoordinates(query.destination());

        MapboxRoutesResponse response;
        try {
            response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/directions/v5/mapbox/{profile}/{coordinates}")
                            .queryParam("overview", "full")
                            .queryParam("geometries", "polyline")
                            .queryParam("access_token", properties.accessToken())
                            .build(profile, coordinates))
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (ignoredRequest, ignoredResponse) -> {
                        throw unavailable("Directions provider rejected the request", null);
                    })
                    .body(MapboxRoutesResponse.class);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (RestClientException exception) {
            throw unavailable("Directions provider is unavailable", exception);
        }

        MapboxRoute route = response == null || response.routes() == null || response.routes().isEmpty()
                ? null
                : response.routes().getFirst();
        if (route == null) {
            throw unavailable("Directions provider returned no route", null);
        }

        return new RouteData(
                Math.round(route.distance()),
                Math.round(route.duration()),
                route.geometry());
    }

    private static String formatCoordinates(Coordinate coordinate) {
        // Mapbox requires longitude,latitude format
        return coordinate.longitude() + "," + coordinate.latitude();
    }

    private static ResponseStatusException unavailable(String detail, Throwable cause) {
        return cause == null
                ? new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, detail)
                : new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, detail, cause);
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record MapboxRoutesResponse(java.util.List<MapboxRoute> routes) {
    }

    record MapboxRoute(double distance, double duration, String geometry) {
    }
}
