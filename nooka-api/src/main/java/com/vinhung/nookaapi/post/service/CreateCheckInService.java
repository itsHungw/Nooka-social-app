package com.vinhung.nookaapi.post.service;

import com.vinhung.nookaapi.media.api.IncomingImage;
import com.vinhung.nookaapi.media.api.MediaService;
import com.vinhung.nookaapi.media.api.StoredImage;
import com.vinhung.nookaapi.post.model.dto.CreateCheckInRequest;
import com.vinhung.nookaapi.post.model.dto.CreateCheckInResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class CreateCheckInService {

    private static final long MAX_PHOTO_BYTES = 10L * 1024 * 1024;
    private static final long MAX_REQUEST_BYTES = 40L * 1024 * 1024;

    private final CreateCheckInTransaction transaction;
    private final MediaService mediaService;

    public CreateCheckInResponse create(UUID authorId, UUID idempotencyKey,
            CreateCheckInRequest request, List<MultipartFile> photos) {
        return transaction.findExisting(authorId, idempotencyKey)
                .orElseGet(() -> createNew(authorId, idempotencyKey, request, photos));
    }

    private CreateCheckInResponse createNew(UUID authorId, UUID idempotencyKey,
            CreateCheckInRequest request, List<MultipartFile> photos) {
        validatePhotos(photos);
        List<StoredImage> stored = new ArrayList<>(photos.size());
        try {
            for (MultipartFile photo : photos) {
                stored.add(mediaService.sanitizeAndStore(new IncomingImage(
                        photo.getBytes(), photo.getContentType(), photo.getOriginalFilename())));
            }
            return transaction.create(authorId, idempotencyKey, request, stored);
        } catch (IOException exception) {
            cleanup(stored, exception);
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Photo could not be read", exception);
        } catch (DataIntegrityViolationException exception) {
            cleanup(stored, exception);
            return transaction.findExisting(authorId, idempotencyKey)
                    .orElseThrow(() -> exception);
        } catch (RuntimeException exception) {
            cleanup(stored, exception);
            throw exception;
        }
    }

    private static void validatePhotos(List<MultipartFile> photos) {
        if (photos == null || photos.isEmpty() || photos.size() > 5) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "A check-in requires 1 to 5 photos");
        }
        long total = 0;
        for (MultipartFile photo : photos) {
            if (photo.isEmpty() || photo.getSize() > MAX_PHOTO_BYTES) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Each photo must be between 1 byte and 10 MB");
            }
            total += photo.getSize();
        }
        if (total > MAX_REQUEST_BYTES) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Photos exceed the 40 MB request limit");
        }
    }

    private void cleanup(List<StoredImage> stored, Exception original) {
        for (StoredImage image : stored) {
            try {
                mediaService.delete(image.storageKey());
            } catch (RuntimeException cleanupFailure) {
                original.addSuppressed(cleanupFailure);
            }
        }
    }
}
