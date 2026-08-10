package com.vinhung.nookaapi.media.integration;

import com.vinhung.nookaapi.media.spi.MediaStorage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "nooka.media.provider", havingValue = "local", matchIfMissing = true)
class FileSystemMediaStorage implements MediaStorage {

    private final Path root;

    FileSystemMediaStorage(@Value("${nooka.media.local.root:${java.io.tmpdir}/nooka-media}") Path root) {
        this.root = root.toAbsolutePath().normalize();
    }

    @Override
    public void put(String storageKey, byte[] content, String contentType) {
        Path target = resolve(storageKey);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, content, StandardOpenOption.CREATE_NEW);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not store sanitized media", exception);
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            Files.deleteIfExists(resolve(storageKey));
        } catch (IOException exception) {
            throw new IllegalStateException("Could not delete media", exception);
        }
    }

    @Override
    public byte[] get(String storageKey) {
        try {
            return Files.readAllBytes(resolve(storageKey));
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read media", exception);
        }
    }

    private Path resolve(String storageKey) {
        Path target = root.resolve(storageKey).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("Invalid media storage key");
        }
        return target;
    }
}
