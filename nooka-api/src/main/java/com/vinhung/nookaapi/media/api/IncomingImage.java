package com.vinhung.nookaapi.media.api;

public record IncomingImage(byte[] content, String contentType, String filename) {
}
