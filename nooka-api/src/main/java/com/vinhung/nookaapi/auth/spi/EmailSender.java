package com.vinhung.nookaapi.auth.spi;

public interface EmailSender {

    void sendVerificationCode(String recipient, String code);

    void sendPasswordResetCode(String recipient, String code);
}
