package com.vinhung.nookaapi.auth.repository;

import com.vinhung.nookaapi.auth.model.entity.EmailVerificationCode;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailVerificationCodeRepository extends JpaRepository<EmailVerificationCode, UUID> {

    Optional<EmailVerificationCode> findTopByUserIdOrderByCreatedAtDesc(UUID userId);
}
