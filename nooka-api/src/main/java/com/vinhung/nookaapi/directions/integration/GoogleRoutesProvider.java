package com.vinhung.nookaapi.directions.integration;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.vinhung.nookaapi.directions.config.GoogleRoutesProperties;
import com.vinhung.nookaapi.directions.model.enums.TravelMode;
import com.vinhung.nookaapi.directions.service.DirectionsProvider;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

public class GoogleRoutesProvider implements DirectionsProvider {

    private static final String FIELD_MASK =
            "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline";
    private static final Pattern DURATION_SECONDS = Pattern.compile("^([0-9]+(?:\\.[0-9]+)?)s$");

    private final RestClient restClient;
    private final GoogleRoutesProperties properties;

    public GoogleRoutesProvider(RestClient restClient, GoogleRoutesProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    @Override
    public String id() {
        return "google";
    }

    @Override
    public DirectionsProvider.RouteData preview(DirectionsProvider.RouteQuery query) {
        if (properties.apiKey() == null || properties.apiKey().isBlank()) {
            throw unavailable("Directions provider is not configured", null);
        }

        GoogleRoutesResponse response;
        try {
            response = restClient.post()
                    .uri("/directions/v2:computeRoutes")
                    .header("X-Goog-Api-Key", properties.apiKey())
                    .header("X-Goog-FieldMask", FIELD_MASK)
                    .body(toGoogleRequest(query))
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (ignoredRequest, ignoredResponse) -> {
                        throw unavailable("Directions provider rejected the request", null);
                    })
                    .body(GoogleRoutesResponse.class);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (RestClientException exception) {
            throw unavailable("Directions provider is unavailable", exception);
        }

        GoogleRoute route = response == null || response.routes() == null || response.routes().isEmpty()
                ? null
                : response.routes().getFirst();
        if (route == null || route.polyline() == null || route.polyline().encodedPolyline() == null) {
            throw unavailable("Directions provider returned no route", null);
        }

        return new DirectionsProvider.RouteData(
                route.distanceMeters(),
                parseDurationSeconds(route.duration()),
                route.polyline().encodedPolyline());
    }

    private static GoogleRoutesRequest toGoogleRequest(DirectionsProvider.RouteQuery query) {
        return new GoogleRoutesRequest(
                waypoint(query.origin()),
                waypoint(query.destination()),
                query.mode().name(),
                query.mode() == TravelMode.DRIVE ? "TRAFFIC_AWARE" : null,
                false,
                "en-US",
                "METRIC");
    }

    private static GoogleWaypoint waypoint(DirectionsProvider.Coordinate coordinate) {
        return new GoogleWaypoint(new GoogleLocation(new GoogleLatLng(coordinate.latitude(), coordinate.longitude())));
    }

    private static long parseDurationSeconds(String duration) {
        if (duration == null) {
            throw unavailable("Directions provider returned an invalid duration", null);
        }
        var matcher = DURATION_SECONDS.matcher(duration);
        if (!matcher.matches()) {
            throw unavailable("Directions provider returned an invalid duration", null);
        }
        return Math.round(Double.parseDouble(matcher.group(1)));
    }

    private static ResponseStatusException unavailable(String detail, Throwable cause) {
        return cause == null
                ? new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, detail)
                : new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, detail, cause);
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record GoogleRoutesRequest(
            GoogleWaypoint origin,
            GoogleWaypoint destination,
            String travelMode,
            String routingPreference,
            boolean computeAlternativeRoutes,
            String languageCode,
            String units) {
    }

    private record GoogleWaypoint(GoogleLocation location) {
    }

    private record GoogleLocation(GoogleLatLng latLng) {
    }

    private record GoogleLatLng(double latitude, double longitude) {
    }

    private record GoogleRoutesResponse(List<GoogleRoute> routes) {
    }

    private record GoogleRoute(long distanceMeters, String duration, GooglePolyline polyline) {
    }

    private record GooglePolyline(String encodedPolyline) {
    }
}
