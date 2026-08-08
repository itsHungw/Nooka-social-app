package com.vinhung.nookaapi.auth.integration;

import com.vinhung.nookaapi.auth.config.AuthProperties;
import com.vinhung.nookaapi.auth.spi.EmailSender;
import java.util.Properties;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class SmtpEmailSender implements EmailSender {

    private final AuthProperties properties;

    @Override
    public void sendVerificationCode(String recipient, String code) {
        send(recipient, "Verify your Nooka email",
                "Your Nooka verification code is " + code + ". It expires in 10 minutes.");
    }

    @Override
    public void sendPasswordResetCode(String recipient, String code) {
        send(recipient, "Reset your Nooka password",
                "Your Nooka password reset code is " + code + ". It expires in 10 minutes.");
    }

    private void send(String recipient, String subject, String body) {
        AuthProperties.Email email = properties.email();
        if (!email.enabled()) {
            return;
        }
        if (email.host() == null || email.host().isBlank() || email.from() == null || email.from().isBlank()) {
            throw new IllegalStateException("Auth email delivery is enabled but SMTP host/from is not configured");
        }
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(email.host());
        sender.setPort(email.port());
        sender.setUsername(email.username());
        sender.setPassword(email.password());
        Properties javaMailProperties = sender.getJavaMailProperties();
        javaMailProperties.put("mail.smtp.auth", !email.username().isBlank());
        javaMailProperties.put("mail.smtp.starttls.enable", "true");

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(email.from());
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(body);
        sender.send(message);
    }
}
