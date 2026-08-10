package com.vinhung.nookaapi.media.spi;

public interface MediaStorage {
    void put(String storageKey, byte[] content, String contentType);

    void delete(String storageKey);

    byte[] get(String storageKey);
}
