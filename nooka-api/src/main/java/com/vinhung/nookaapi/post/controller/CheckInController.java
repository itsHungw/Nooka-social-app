package com.vinhung.nookaapi.post.controller;

import com.vinhung.nookaapi.post.model.dto.CreateCheckInRequest;
import com.vinhung.nookaapi.post.model.dto.CreateCheckInResponse;
import com.vinhung.nookaapi.post.service.CreateCheckInService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.net.URI;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/v1/posts/check-ins")
@RequiredArgsConstructor
@Validated
public class CheckInController {

    private final CreateCheckInService service;

    @PostMapping(consumes = "multipart/form-data")
    ResponseEntity<CreateCheckInResponse> create(
            Principal principal,
            @RequestHeader("Idempotency-Key") UUID idempotencyKey,
            @Valid @RequestPart("post") CreateCheckInRequest request,
            @Size(min = 1, max = 5) @RequestPart("photos") List<MultipartFile> photos) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        UUID authorId = UUID.fromString(principal.getName());
        CreateCheckInResponse response = service.create(authorId, idempotencyKey, request, photos);
        return ResponseEntity.created(URI.create("/v1/posts/" + response.publicId()))
                .body(response);
    }
}
