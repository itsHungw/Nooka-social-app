package com.vinhung.nookaapi.post.api;

import java.util.UUID;

/** Minimal safe projection until the feed endpoint defines its complete contract. */
public record PostCardView(UUID id) {
}
