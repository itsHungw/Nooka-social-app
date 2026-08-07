package com.vinhung.nookaapi.directions.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.vinhung.nookaapi.directions.config.MapboxDirectionsProperties;
import com.vinhung.nookaapi.directions.model.enums.TravelMode;
import com.vinhung.nookaapi.directions.service.DirectionsProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@DisplayName("MapboxDirectionsProvider")
class MapboxDirectionsProviderTest {

    private static final String BASE_URL = "https://api.mapbox.com";
    private static final String TEST_TOKEN = "test-token";

    private MapboxDirectionsProvider provider;

    @BeforeEach
    void setUp() {
        RestClient restClient = mock(RestClient.class);
        MapboxDirectionsProperties properties = new MapboxDirectionsProperties(TEST_TOKEN, BASE_URL);
        provider = new MapboxDirectionsProvider(restClient, properties);
    }

    @Test
    @DisplayName("id returns mapbox")
    void id_returnsMapbox() {
        assertThat(provider.id()).isEqualTo("mapbox");
    }

    @Test
    @DisplayName("preview throws 503 when token is missing")
    void preview_missingToken_throws503() {
        // Create provider without token
        MapboxDirectionsProperties noTokenProperties = new MapboxDirectionsProperties(null, BASE_URL);
        MapboxDirectionsProvider noTokenProvider = new MapboxDirectionsProvider(mock(RestClient.class), noTokenProperties);

        // Act & Assert
        assertThatThrownBy(() -> noTokenProvider.preview(new DirectionsProvider.RouteQuery(
                new DirectionsProvider.Coordinate(10.7769, 106.7009),
                new DirectionsProvider.Coordinate(10.7806, 106.699),
                TravelMode.DRIVE)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                });
    }

    @Test
    @DisplayName("preview throws 503 when token is blank")
    void preview_blankToken_throws503() {
        MapboxDirectionsProperties blankTokenProperties = new MapboxDirectionsProperties("   ", BASE_URL);
        MapboxDirectionsProvider blankTokenProvider = new MapboxDirectionsProvider(mock(RestClient.class), blankTokenProperties);

        // Act & Assert
        assertThatThrownBy(() -> blankTokenProvider.preview(new DirectionsProvider.RouteQuery(
                new DirectionsProvider.Coordinate(10.7769, 106.7009),
                new DirectionsProvider.Coordinate(10.7806, 106.699),
                TravelMode.DRIVE)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                });
    }
}
