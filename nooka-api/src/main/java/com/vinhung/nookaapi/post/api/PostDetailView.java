package com.vinhung.nookaapi.post.api;

import java.util.UUID;

/** Minimal safe projection until the detail endpoint defines its complete contract. */
public record PostDetailView(UUID id) {
}
