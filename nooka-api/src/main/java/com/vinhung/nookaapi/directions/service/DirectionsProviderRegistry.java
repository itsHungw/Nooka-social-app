package com.vinhung.nookaapi.directions.service;

import com.vinhung.nookaapi.directions.config.DirectionsProperties;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class DirectionsProviderRegistry {

    private final Map<String, DirectionsProvider> providers;
    private final String selectedProviderId;

    public DirectionsProviderRegistry(List<DirectionsProvider> providers, DirectionsProperties properties) {
        this.providers = providers.stream()
                .collect(Collectors.toUnmodifiableMap(
                        provider -> provider.id().toLowerCase(Locale.ROOT),
                        Function.identity()));
        this.selectedProviderId = normalize(properties.provider());
    }

    public DirectionsProvider selected() {
        var provider = providers.get(selectedProviderId);
        if (provider == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Directions provider is not available: " + selectedProviderId);
        }
        return provider;
    }

    private static String normalize(String providerId) {
        if (providerId == null || providerId.isBlank()) {
            return "google";
        }
        return providerId.trim().toLowerCase(Locale.ROOT);
    }
}
