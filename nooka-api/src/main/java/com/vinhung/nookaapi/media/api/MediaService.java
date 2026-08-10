package com.vinhung.nookaapi.media.api;

import com.vinhung.nookaapi.media.service.ImageSanitizer;
import com.vinhung.nookaapi.media.spi.MediaStorage;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MediaService {

    private final ImageSanitizer sanitizer;
    private final MediaStorage storage;

    public StoredImage sanitizeAndStore(IncomingImage incoming) {
        ImageSanitizer.SanitizedImage sanitized = sanitizer.sanitize(incoming);
        String extension = sanitized.contentType().equals("image/png") ? "png" : "jpg";
        String storageKey = "check-ins/" + UUID.randomUUID() + "." + extension;
        storage.put(storageKey, sanitized.content(), sanitized.contentType());
        return new StoredImage(storageKey, sanitized.contentType(), sanitized.content().length,
                sanitized.checksum(), sanitized.width(), sanitized.height());
    }

    public void delete(String storageKey) {
        storage.delete(storageKey);
    }

    public byte[] read(String storageKey) {
        return storage.get(storageKey);
    }
}
