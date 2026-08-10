package com.vinhung.nookaapi.auth.repository;

import com.vinhung.nookaapi.auth.model.entity.PendingRegistration;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PendingRegistrationRepository extends JpaRepository<PendingRegistration, UUID> {

    Optional<PendingRegistration> findByEmailIgnoreCase(String email);

    Optional<PendingRegistration> findByCompletionTokenHash(String completionTokenHash);
}
