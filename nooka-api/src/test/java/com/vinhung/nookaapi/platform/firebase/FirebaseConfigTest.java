package com.vinhung.nookaapi.platform.firebase;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class FirebaseConfigTest {

    @Test
    void authenticationFailsClosedWithoutProjectId() {
        var config = new FirebaseConfig();

        assertThatThrownBy(() -> config.firebaseApp(new FirebaseProperties("")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("FIREBASE_PROJECT_ID");
    }
}