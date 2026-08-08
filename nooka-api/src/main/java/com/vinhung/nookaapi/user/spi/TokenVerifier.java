package com.vinhung.nookaapi.user.spi;

import java.util.UUID;

/** Verifies a bearer token and returns the internal user ID. */
public interface TokenVerifier {
    UUID verify(String token);
}
