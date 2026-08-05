package com.vinhung.nookaapi.platform.firebase;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.vinhung.nookaapi.user.spi.TokenVerifier;
import java.io.IOException;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(FirebaseProperties.class)
@ConditionalOnProperty(name = "nooka.security.enabled", havingValue = "true", matchIfMissing = true)
class FirebaseConfig {

    @Bean(destroyMethod = "delete")
    FirebaseApp firebaseApp(FirebaseProperties properties) throws IOException {
        if (properties.projectId() == null || properties.projectId().isBlank()) {
            throw new IllegalStateException(
                    "FIREBASE_PROJECT_ID is required when authentication is enabled");
        }
        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.getApplicationDefault())
                .setProjectId(properties.projectId())
                .build();
        return FirebaseApp.initializeApp(options, "nooka-api-" + UUID.randomUUID());
    }

    @Bean
    TokenVerifier tokenVerifier(FirebaseApp firebaseApp) {
        return new FirebaseTokenVerifier(FirebaseAuth.getInstance(firebaseApp));
    }
}