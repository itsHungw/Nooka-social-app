package com.vinhung.nookaapi.post.controller;

import com.vinhung.nookaapi.post.model.dto.MediaContent;
import com.vinhung.nookaapi.post.service.PostMediaService;
import java.security.Principal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/posts/{postPublicId}/media")
@RequiredArgsConstructor
class PostMediaController {

    private final PostMediaService service;

    @GetMapping("/{mediaPublicId}")
    ResponseEntity<byte[]> read(
            @PathVariable UUID postPublicId,
            @PathVariable UUID mediaPublicId,
            Principal principal) {
        UUID viewerId = principal == null ? null : UUID.fromString(principal.getName());
        MediaContent media = service.read(postPublicId, mediaPublicId, viewerId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(media.contentType()))
                .cacheControl(CacheControl.noStore())
                .body(media.bytes());
    }
}
