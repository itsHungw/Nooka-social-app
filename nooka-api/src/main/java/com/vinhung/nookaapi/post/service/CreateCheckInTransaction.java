package com.vinhung.nookaapi.post.service;

import com.vinhung.nookaapi.media.api.StoredImage;
import com.vinhung.nookaapi.post.api.PostCreated;
import com.vinhung.nookaapi.post.entity.Post;
import com.vinhung.nookaapi.post.model.dto.CreateCheckInRequest;
import com.vinhung.nookaapi.post.model.dto.CreateCheckInResponse;
import com.vinhung.nookaapi.post.model.dto.PostMediaResponse;
import com.vinhung.nookaapi.post.model.dto.MediaCropRequest;
import com.vinhung.nookaapi.post.repository.PostStore;
import com.vinhung.nookaapi.shared.error.ResourceNotFoundException;
import com.vinhung.nookaapi.spot.api.CheckInSpot;
import com.vinhung.nookaapi.spot.api.SpotAccess;
import com.vinhung.nookaapi.user.api.UserAccess;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Component
@RequiredArgsConstructor
class CreateCheckInTransaction {

    private final PostStore posts;
    private final UserAccess users;
    private final SpotAccess spots;
    private final ApplicationEventPublisher events;

    @Transactional(readOnly = true)
    public Optional<CreateCheckInResponse> findExisting(UUID authorId, UUID idempotencyKey) {
        return posts.findIdempotent(authorId, idempotencyKey).map(this::responseFor);
    }

    @Transactional
    public CreateCheckInResponse create(UUID authorId, UUID idempotencyKey,
            CreateCheckInRequest request, List<StoredImage> media) {
        Optional<Post> existing = posts.findIdempotent(authorId, idempotencyKey);
        if (existing.isPresent()) {
            return responseFor(existing.get());
        }
        if (!users.isActive(authorId)) {
            throw new ResourceNotFoundException("Account is not available");
        }
        CheckInSpot spot = spots.resolveForCheckIn(request.spotId(), authorId)
                .orElseThrow(() -> new ResourceNotFoundException("Spot is not available"));
        List<UUID> audience = validateAudience(authorId, request);

        Post post = Post.builder()
                .authorId(authorId)
                .spotId(spot.spotId())
                .visibility(request.visibility())
                .caption(trimToNull(request.caption()))
                .oneThingToKnow(trimToNull(request.oneThingToKnow()))
                .occasion(trimToNull(request.occasion()))
                .partySize(request.partySize())
                .wouldReturn(request.wouldReturn())
                .hideTime(request.hideTime() == null || request.hideTime())
                .inspiredByPostId(spot.inspiredByPostId())
                .idempotencyKey(idempotencyKey)
                .build();
        Post saved = posts.saveAndRefresh(post);
        List<PostStore.StoredMedia> storedMedia = posts.insertMedia(
                saved, media, validateMediaCrops(request.media(), media.size()));
        posts.insertHashtags(saved.getId(), normalizeHashtags(request.hashtags()));
        posts.insertAudience(saved.getId(), audience);
        events.publishEvent(new PostCreated(
                UUID.randomUUID(), saved.getId(), authorId, saved.getSpotId()));
        return response(saved, storedMedia, spot.wantToGoPresent(), audience);
    }

    private CreateCheckInResponse responseFor(Post post) {
        boolean wantToGoPresent = spots.resolveForCheckIn(post.getSpotId(), post.getAuthorId())
                .map(CheckInSpot::wantToGoPresent)
                .orElse(false);
        return response(post, posts.mediaFor(post.getId()), wantToGoPresent,
                posts.audienceFor(post.getId()));
    }

    private static CreateCheckInResponse response(Post post,
            List<PostStore.StoredMedia> media, boolean wantToGoPresent,
            List<UUID> audienceUserIds) {
        List<PostMediaResponse> mediaResponse = media.stream()
                .map(item -> new PostMediaResponse(
                        item.publicId(),
                        "/v1/posts/" + post.getPublicId() + "/media/" + item.publicId(),
                        item.width(), item.height(), item.position(),
                        item.cropZoom(), item.cropOffsetX(), item.cropOffsetY()))
                .toList();
        return new CreateCheckInResponse(
                post.getPublicId(), post.getSpotId(), post.getVisibility().name(),
                !post.isHideTime(), "PENDING", wantToGoPresent,
                audienceUserIds, mediaResponse);
    }

    private List<UUID> validateAudience(UUID authorId, CreateCheckInRequest request) {
        List<UUID> audience = request.audienceUserIds() == null
                ? List.of()
                : request.audienceUserIds().stream().distinct().toList();
        boolean selected = request.visibility()
                == com.vinhung.nookaapi.shared.model.Visibility.SELECTED_FRIENDS;
        if (selected && audience.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Selected friends visibility requires an audience");
        }
        if (!selected && !audience.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Audience is only valid for selected friends visibility");
        }
        if (!users.areMutualFriends(authorId, audience)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Audience must contain mutual friends only");
        }
        return audience;
    }

    private static List<MediaCropRequest> validateMediaCrops(
            List<MediaCropRequest> crops, int photoCount) {
        if (crops == null || crops.isEmpty()) {
            return java.util.stream.IntStream.range(0, photoCount)
                    .mapToObj(ignored -> MediaCropRequest.centered())
                    .toList();
        }
        if (crops.size() != photoCount) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Media crop count must match photo count");
        }
        return List.copyOf(crops);
    }

    private static List<PostStore.Hashtag> normalizeHashtags(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        LinkedHashMap<String, String> distinct = new LinkedHashMap<>();
        for (String raw : values) {
            String display = raw == null ? "" : raw.trim();
            if (display.startsWith("#")) {
                display = display.substring(1).trim();
            }
            display = Normalizer.normalize(display, Normalizer.Form.NFC);
            if (display.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Hashtags cannot be blank");
            }
            String key = display.toLowerCase(Locale.ROOT);
            distinct.putIfAbsent(key, display);
        }
        List<PostStore.Hashtag> result = new ArrayList<>(distinct.size());
        distinct.forEach((key, display) -> result.add(new PostStore.Hashtag(display, key)));
        return List.copyOf(result);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
