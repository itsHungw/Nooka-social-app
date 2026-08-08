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
        // PostGIS bắt buộc từ V3_1: chống trùng place ở §7 so toạ độ trong bán
        // kính bằng ST_DWithin, và image chính thức `postgres:17-alpine` không
        // có extension này.
        //
        // `asCompatibleSubstituteFor` cần thiết vì Testcontainers chỉ nhận image
        // tên `postgres` cho PostgreSQLContainer; không có nó thì container từ
        // chối khởi động dù image hoàn toàn tương thích.
        return new PostgreSQLContainer<>(
                DockerImageName.parse("postgis/postgis:17-3.5-alpine")
                        .asCompatibleSubstituteFor("postgres"));
    }
}
