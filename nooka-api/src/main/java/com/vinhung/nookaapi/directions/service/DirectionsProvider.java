package com.vinhung.nookaapi.directions.service;

import com.vinhung.nookaapi.directions.model.enums.TravelMode;

public interface DirectionsProvider {

    String id();

    RouteData preview(RouteQuery query);

    record RouteQuery(Coordinate origin, Coordinate destination, TravelMode mode) {
    }

    record Coordinate(double latitude, double longitude) {
    }

    record RouteData(long distanceMeters, long durationSeconds, String encodedPolyline) {
    }
}
