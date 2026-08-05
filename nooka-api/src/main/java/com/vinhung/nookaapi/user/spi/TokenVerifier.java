package com.vinhung.nookaapi.user.spi;

/** Verifies an external identity token and returns the Firebase user ID. */
public interface TokenVerifier {
    String verify(String token);
}