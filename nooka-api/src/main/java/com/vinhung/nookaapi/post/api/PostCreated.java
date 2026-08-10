package com.vinhung.nookaapi.post.api;

import java.util.UUID;

/** Durable cross-module fact emitted in the transaction that publishes a Post. */
public record PostCreated(UUID eventId, UUID postId, UUID authorId, UUID spotId) {
}
