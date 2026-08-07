package com.vinhung.nookaapi.directions.cache;

import com.vinhung.nookaapi.directions.model.dto.RoutePreviewResponse;
import java.util.Optional;

public interface RoutePreviewCache {

    Optional<RoutePreviewResponse> find(RoutePreviewCacheKey key);

    void put(RoutePreviewCacheKey key, RoutePreviewResponse response);
}