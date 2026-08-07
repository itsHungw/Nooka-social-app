package com.vinhung.nookaapi.directions.controller;

import com.vinhung.nookaapi.directions.model.dto.RoutePreviewRequest;
import com.vinhung.nookaapi.directions.model.dto.RoutePreviewResponse;
import com.vinhung.nookaapi.directions.service.RoutePreviewService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/directions")
class DirectionsController {

    private final RoutePreviewService routePreviewService;

    DirectionsController(RoutePreviewService routePreviewService) {
        this.routePreviewService = routePreviewService;
    }

    @PostMapping("/preview")
    RoutePreviewResponse preview(@Valid @RequestBody RoutePreviewRequest request) {
        return routePreviewService.preview(request);
    }
}
