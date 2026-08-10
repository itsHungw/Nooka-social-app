package com.vinhung.nookaapi.auth.repository;

import com.vinhung.nookaapi.auth.model.entity.OAuthAccount;
import com.vinhung.nookaapi.auth.model.enums.OAuthProvider;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OAuthAccountRepository extends JpaRepository<OAuthAccount, UUID> {

    Optional<OAuthAccount> findByProviderAndSubject(OAuthProvider provider, String subject);
}
