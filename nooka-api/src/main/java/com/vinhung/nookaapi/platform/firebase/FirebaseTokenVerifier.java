package com.vinhung.nookaapi.platform.firebase;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.vinhung.nookaapi.user.spi.TokenVerificationException;
import com.vinhung.nookaapi.user.spi.TokenVerifier;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
class FirebaseTokenVerifier implements TokenVerifier {

    private final FirebaseAuth firebaseAuth;

    @Override
    public String verify(String token) {
        try {
            return firebaseAuth.verifyIdToken(token).getUid();
        } catch (FirebaseAuthException | IllegalArgumentException exception) {
            throw new TokenVerificationException(exception);
        }
    }
}