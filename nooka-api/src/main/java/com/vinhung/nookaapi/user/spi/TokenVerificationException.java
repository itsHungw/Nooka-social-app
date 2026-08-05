package com.vinhung.nookaapi.user.spi;

public class TokenVerificationException extends RuntimeException {

    public TokenVerificationException(Throwable cause) {
        super("Invalid authentication token", cause);
    }
}