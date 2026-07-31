package com.vinhung.nookaapi;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Cung cấp một Postgres thật cho test thông qua Testcontainers.
 *
 * <p>Không dùng H2: Flyway migration được viết cho Postgres, và sự khác biệt
 * về dialect sẽ khiến test xanh trong khi production đỏ.
 *
 * <p>Yêu cầu Docker đang chạy.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgresContainer() {
        return new PostgreSQLContainer<>(DockerImageName.parse("postgres:17-alpine"));
    }
}
