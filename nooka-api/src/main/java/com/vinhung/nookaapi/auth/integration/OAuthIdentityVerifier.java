package com.vinhung.nookaapi.auth.integration;

import com.vinhung.nookaapi.auth.model.enums.OAuthProvider;

public interface OAuthIdentityVerifier {

    OAuthProvider provider();

    OAuthIdentity verify(String token);
}
