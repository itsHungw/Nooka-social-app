package com.vinhung.nookaapi.platform.firebase;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("nooka.firebase")
record FirebaseProperties(String projectId) {
}