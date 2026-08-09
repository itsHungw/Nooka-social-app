package com.vinhung.nookaapi.db;

import static org.assertj.core.api.Assertions.assertThat;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * Chống trùng place ở §7 cần cả hai extension: PostGIS để so toạ độ trong bán
 * kính, pg_trgm để so tên gần giống. Thiếu một cái là truy vấn ở
 * {@code JpaSpotDuplicateFinder} không chạy, và lỗi sẽ hiện ra ở một chỗ khó
 * đọc hơn nhiều.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class DatabaseExtensionsTest {

    @Autowired
    private EntityManager em;

    @Test
    @DisplayName("Extension postgis và pg_trgm đã được bật")
    void requiredExtensionsAreInstalled() {
        Object count = em.createNativeQuery(
                        "select count(*) from pg_extension where extname in ('postgis', 'pg_trgm')")
                .getSingleResult();

        assertThat(((Number) count).intValue()).isEqualTo(2);
    }

    @Test
    @DisplayName("Hàm của PostGIS gọi được")
    void postgisFunctionsAreCallable() {
        Object distance = em.createNativeQuery(
                        """
                        select ST_Distance(
                            ST_SetSRID(ST_MakePoint(106.70428, 10.77256), 4326)::geography,
                            ST_SetSRID(ST_MakePoint(106.70428, 10.77300), 4326)::geography)
                        """)
                .getSingleResult();

        // Hai điểm cách nhau 0.00044 độ vĩ, tức khoảng 49m.
        assertThat(((Number) distance).doubleValue()).isBetween(40.0, 60.0);
    }

    @Test
    @DisplayName("Hàm similarity của pg_trgm gọi được")
    void trigramSimilarityIsCallable() {
        Object similarity = em.createNativeQuery(
                        "select similarity('the workshop coffee', 'workshop coffee')")
                .getSingleResult();

        assertThat(((Number) similarity).doubleValue()).isGreaterThan(0.3);
    }
}
