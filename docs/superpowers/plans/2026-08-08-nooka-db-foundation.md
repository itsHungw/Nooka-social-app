# Nooka Database — Giai đoạn 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng nền database cho Nooka — bật PostGIS, vá cột hồ sơ người dùng, thêm nguồn gốc và cơ chế chống trùng cho địa điểm, giờ mở cửa, và bịt hai lỗ bảo mật đã tìm ra trong `V1__baseline.sql`.

**Architecture:** Mỗi task tạo đúng một Flyway migration mang version phụ (`V3_1`, `V3_2`, …) — Flyway chuẩn hoá dấu gạch dưới thành dấu chấm nên tất cả sắp giữa `V3` và `V4`, giữ đúng tên giai đoạn trong spec mà vẫn cho mỗi task một migration bất biến riêng. Entity JPA sửa cùng migration của nó; `ddl-auto=validate` là lưới an toàn. Truy vấn không gian chạy bằng native query nên không cần thêm dependency Java nào.

**Tech Stack:** Java 21 · Spring Boot 4.1.0 · Spring Data JPA · Flyway · PostgreSQL 17 + PostGIS 3.5 + pg_trgm · Testcontainers 1.21.3 · JUnit Jupiter · AssertJ · Lombok · ArchUnit 1.4.2

**Spec:** [`docs/superpowers/specs/2026-08-08-nooka-database-design.md`](../specs/2026-08-08-nooka-database-design.md) — mục 6 là phạm vi của plan này.

## Global Constraints

Mọi task đều phải giữ những luật sau. Chúng đến từ `nooka-api/AGENTS.md` và product spec, không phải ý kiến của plan này.

- **Flyway sở hữu schema. Hibernate giữ `ddl-auto: validate`.** Không bao giờ để Hibernate tự tạo hay sửa bảng.
- **Không sửa migration đã tồn tại.** `V1__baseline.sql` và `V2__modulith_event_publication.sql` là bất biến. Sai thì sửa bằng migration mới, không chỉnh lịch sử. Quy tắc này cũng áp cho mọi file `V3_*` sau khi task tạo ra nó đã được commit.
- **`post.repository.PostRepository` phải tiếp tục package-private.** Mọi đường đọc `Post` đi qua `post.api.PostAccess`.
- **Không tạo cross-module JPA association.** `Post` giữ `authorId`/`spotId` dạng `UUID`; `Spot` giữ `createdById` dạng `UUID`. Foreign key ở tầng database thì vẫn có và vẫn giữ — luật cấm là cấm `@ManyToOne` chéo module. ArchUnit đang canh bằng `postDoesNotDependOnOtherModuleEntities`.
- **Module `post` không được import `..user.entity..` hay `..spot.entity..`.** Cần dữ liệu từ `user` thì đi qua `user.query.RelationshipCriteria`.
- **Không dùng `@Data` hay `@EqualsAndHashCode` trên entity kế thừa `BaseEntity`.** Dùng `@Getter`, `@Setter`, `@SuperBuilder`, `@NoArgsConstructor(access = AccessLevel.PROTECTED)` như mọi entity hiện có.
- **Không thay PostgreSQL bằng H2 trong test.** Testcontainers với Postgres thật là bắt buộc; migration được viết cho Postgres.
- **Timestamp tuyệt đối dùng `timestamptz`** ở SQL và `java.time.Instant` ở Java.
- **Mọi thay đổi luật visibility phải viết test trước**, gồm cả chiều quan hệ và trường hợp âm.
- **Không log token, password, PII nhạy cảm hay nội dung `PRIVATE`.**
- **Không tạo commit, branch hay worktree ngoài những gì plan này ghi rõ.**

Lệnh chạy test trên Windows (máy dev của dự án):

```powershell
.\mvnw.cmd test
```

Chạy một test cụ thể:

```powershell
.\mvnw.cmd "-Dtest=TenClassTest" test
```

**Mọi task đều cần Docker đang chạy.** Test tích hợp dùng Testcontainers; không có Docker thì báo lỗi môi trường chứ không bỏ qua test.

---

## File Structure

### File mới

| File | Trách nhiệm |
|---|---|
| `src/main/resources/db/migration/V3_1__extensions.sql` | Bật `postgis` và `pg_trgm` |
| `src/main/resources/db/migration/V3_2__city_timezone.sql` | Múi giờ cho thành phố |
| `src/main/resources/db/migration/V3_3__user_profile.sql` | Cột hồ sơ và xoá tài khoản |
| `src/main/resources/db/migration/V3_4__spot_source.sql` | Nguồn gốc của spot |
| `src/main/resources/db/migration/V3_5__place_geography.sql` | Cột `geog` sinh tự động và index không gian |
| `src/main/resources/db/migration/V3_6__spot_merge_candidates.sql` | Hàng đợi ứng viên gộp |
| `src/main/resources/db/migration/V3_7__spot_hours.sql` | Giờ mở cửa |
| `src/main/resources/db/migration/V3_8__post_public_id.sql` | ID công khai cho bài viết |
| `src/main/resources/db/migration/V3_9__media_reports_notifications.sql` | Trạng thái ảnh, vá FK báo cáo, payload thông báo |
| `src/main/java/com/vinhung/nookaapi/spot/model/enums/SpotSource.java` | Enum `USER_CREATED` / `SEEDED` |
| `src/main/java/com/vinhung/nookaapi/spot/api/SpotDuplicateFinder.java` | Cổng tìm spot trùng, đối xứng với `PostAccess` |
| `src/main/java/com/vinhung/nookaapi/spot/api/DuplicateSpotCandidate.java` | Record kết quả trả về |
| `src/main/java/com/vinhung/nookaapi/spot/repository/JpaSpotDuplicateFinder.java` | Native query PostGIS + pg_trgm, package-private |
| `src/test/java/com/vinhung/nookaapi/db/DatabaseExtensionsTest.java` | Chứng minh extension đã bật |
| `src/test/java/com/vinhung/nookaapi/shared/entity/BaseEntityIdTest.java` | Chứng minh id sinh ra là UUID v7 |
| `src/test/java/com/vinhung/nookaapi/user/entity/UserProfileColumnsTest.java` | Cột mới và ràng buộc độ dài bio |
| `src/test/java/com/vinhung/nookaapi/spot/CityTimezoneTest.java` | Mặc định múi giờ |
| `src/test/java/com/vinhung/nookaapi/spot/SpotSourceTest.java` | Mặc định và ràng buộc `source` |
| `src/test/java/com/vinhung/nookaapi/spot/SpotDuplicateFinderTest.java` | Chống trùng theo bán kính và tên |
| `src/test/java/com/vinhung/nookaapi/spot/SpotMergeCandidateConstraintTest.java` | Ràng buộc thứ tự cặp |
| `src/test/java/com/vinhung/nookaapi/spot/SpotHoursConstraintTest.java` | Ràng buộc ngày trong tuần |
| `src/test/java/com/vinhung/nookaapi/post/PostPublicIdTest.java` | `public_id` sinh tự động và duy nhất |
| `src/test/java/com/vinhung/nookaapi/db/ReportsAndNotificationsTest.java` | FK báo cáo sống sót, chống trùng thông báo |

### File sửa

| File | Sửa gì |
|---|---|
| `infra/compose.yaml:3` | Đổi image Postgres |
| `src/test/java/com/vinhung/nookaapi/TestcontainersConfiguration.java:23` | Đổi image Postgres |
| `src/main/java/com/vinhung/nookaapi/shared/entity/BaseEntity.java:33-35` | UUID v7 |
| `src/main/java/com/vinhung/nookaapi/spot/entity/City.java` | Thêm `timezone` |
| `src/main/java/com/vinhung/nookaapi/user/entity/User.java` | Thêm 6 cột |
| `src/main/java/com/vinhung/nookaapi/spot/entity/Spot.java` | Thêm `source` |
| `src/main/java/com/vinhung/nookaapi/post/entity/Post.java` | Thêm `publicId` |
| `src/main/java/com/vinhung/nookaapi/user/query/RelationshipCriteria.java` | Thêm `deletedAuthorExists` |
| `src/main/java/com/vinhung/nookaapi/user/query/JpaRelationshipCriteria.java` | Cài đặt `deletedAuthorExists` |
| `src/main/java/com/vinhung/nookaapi/post/repository/PostVisibilityRules.java` | Áp R9 ở cả hai nhánh |
| `src/test/java/com/vinhung/nookaapi/post/PostVisibilityRulesTest.java` | Thêm test R9 |
| `nooka-api/README.md` | Ghi yêu cầu image PostGIS |
| `nooka-api/AGENTS.md` | Ghi R9 và quyết định UUIDv7 |
| `nooka-api/MEMORY.md` | Ghi tiến độ giai đoạn 1 |

### Không tạo entity cho ba bảng

`spot_merge_candidates`, `spot_hours` và các cột mới trên `post_media` / `reports` / `notifications` **không** có entity JPA trong giai đoạn này. Ba bảng cuối vốn đã không có entity từ `V1`. Entity sẽ đến cùng service ghi vào chúng, ở giai đoạn sau. Test cho chúng dùng native SQL để chứng minh constraint đang bật — đó là thứ duy nhất cần chứng minh ở giai đoạn nền.

---

## Task 1: Đổi Postgres image sang PostGIS và bật extension

Đây là task chặn: mọi task sau đều cần `postgis` hoặc `pg_trgm`.

**Files:**
- Create: `src/main/resources/db/migration/V3_1__extensions.sql`
- Create: `src/test/java/com/vinhung/nookaapi/db/DatabaseExtensionsTest.java`
- Modify: `infra/compose.yaml:3`
- Modify: `src/test/java/com/vinhung/nookaapi/TestcontainersConfiguration.java:23`
- Modify: `nooka-api/README.md`

**Interfaces:**
- Consumes: không có
- Produces: hai extension `postgis` và `pg_trgm` có mặt trong mọi database test và local. Task 6 dùng `similarity()` từ `pg_trgm`; Task 5 và 6 dùng `ST_MakePoint`, `ST_SetSRID`, `ST_DWithin`, `ST_Distance` từ `postgis`.

---

- [ ] **Step 1: Viết test thất bại**

Tạo `src/test/java/com/vinhung/nookaapi/db/DatabaseExtensionsTest.java`:

```java
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
 * kính, pg_trgm để so tên gần giống. Thiếu một cái là truy vấn ở Task 6 không
 * chạy, và lỗi sẽ hiện ra ở một chỗ khó đọc hơn nhiều.
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
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```powershell
.\mvnw.cmd "-Dtest=DatabaseExtensionsTest" test
```

Kết quả mong đợi: FAIL. `requiredExtensionsAreInstalled` trả về 0 thay vì 2, và hai test kia ném `PSQLException: function st_distance(...) does not exist`.

- [ ] **Step 3: Đổi image trong Testcontainers**

Sửa `src/test/java/com/vinhung/nookaapi/TestcontainersConfiguration.java`. Thay thân method `postgresContainer()`:

```java
    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgresContainer() {
        // PostGIS bắt buộc từ V3_1: chống trùng place ở §7 so toạ độ trong bán
        // kính bằng ST_DWithin. Image chính thức `postgres:17-alpine` không có
        // extension này. `asCompatibleSubstituteFor` cần thiết vì Testcontainers
        // chỉ nhận image tên `postgres` cho PostgreSQLContainer.
        return new PostgreSQLContainer<>(
                DockerImageName.parse("postgis/postgis:17-3.5-alpine")
                        .asCompatibleSubstituteFor("postgres"));
    }
```

- [ ] **Step 4: Đổi image trong compose**

Sửa `infra/compose.yaml`, dòng 3:

```yaml
    image: postgis/postgis:17-3.5-alpine
```

- [ ] **Step 5: Viết migration bật extension**

Tạo `src/main/resources/db/migration/V3_1__extensions.sql`:

```sql
-- Giai đoạn 1 của thiết kế database — mục 6.1 của spec.
--
-- Hai extension này phục vụ đúng một yêu cầu của §7 product spec:
--   "cần cơ chế chống trùng place ngay từ đầu (so tên + tọa độ trong bán kính,
--    gợi ý merge)"
--
-- pg_trgm cho phần "so tên", postgis cho phần "tọa độ trong bán kính".
--
-- Image bắt buộc là `postgis/postgis:17-3.5-alpine`; `postgres:17-alpine` không có
-- PostGIS. Xem README.md.

create extension if not exists pg_trgm;
create extension if not exists postgis;
```

- [ ] **Step 6: Chạy test để chắc chắn nó xanh**

```powershell
.\mvnw.cmd "-Dtest=DatabaseExtensionsTest" test
```

Kết quả mong đợi: PASS, cả ba test.

Lần chạy đầu sẽ lâu vì Docker phải tải image `postgis/postgis:17-3.5-alpine` (178MB sau khi giải nén). Đây là chi phí một lần cho mỗi máy.

Bản `-alpine` được chọn thay cho `postgis/postgis:17-3.5` vì nó nhỏ hơn đáng kể và khớp quy ước image đang có của dự án (`postgres:17-alpine`, `redis:7-alpine`).

- [ ] **Step 7: Chạy toàn bộ test để chắc chắn image mới không phá gì**

```powershell
.\mvnw.cmd test
```

Kết quả mong đợi: PASS toàn bộ. Nếu `NookaApiApplicationTests` hay `PostVisibilityRulesTest` đỏ thì image mới có vấn đề, không phải migration — đọc log của container trước khi sửa migration.

- [ ] **Step 8: Cập nhật README**

Trong `nooka-api/README.md`, tìm phần mô tả yêu cầu môi trường (chỗ nói về Docker và PostgreSQL) và thêm đoạn này vào đó:

```markdown
### PostgreSQL phải có PostGIS

Từ migration `V3_1`, schema cần hai extension `postgis` và `pg_trgm`. Image
`postgres:17-alpine` **không** có PostGIS, nên cả `infra/compose.yaml` lẫn
Testcontainers đều dùng `postgis/postgis:17-3.5-alpine`.

Nếu bạn đang chạy một PostgreSQL cài sẵn ngoài Docker, cài PostGIS 3.5 trước
khi chạy migration. Không có nó thì `V3_1` thất bại ngay dòng đầu.
```

- [ ] **Step 9: Commit**

```bash
git add src/main/resources/db/migration/V3_1__extensions.sql src/test/java/com/vinhung/nookaapi/db/DatabaseExtensionsTest.java src/test/java/com/vinhung/nookaapi/TestcontainersConfiguration.java infra/compose.yaml README.md
git commit -m "feat(db): enable postgis and pg_trgm for place deduplication"
```

---

## Task 2: `BaseEntity` sinh UUID v7

Không cần migration. Không cần migrate dữ liệu: dòng cũ giữ v4, dòng mới nhận v7, cả hai đều là UUID hợp lệ.

**Files:**
- Modify: `src/main/java/com/vinhung/nookaapi/shared/entity/BaseEntity.java:33-35`
- Create: `src/test/java/com/vinhung/nookaapi/shared/entity/BaseEntityIdTest.java`

**Interfaces:**
- Consumes: không có
- Produces: mọi entity kế thừa `BaseEntity` nhận id UUID version 7 khi persist. Task 10 dựa vào việc `posts.id` là v7 để giải thích vì sao cần `public_id` riêng.

---

- [ ] **Step 1: Viết test thất bại**

Tạo `src/test/java/com/vinhung/nookaapi/shared/entity/BaseEntityIdTest.java`:

```java
package com.vinhung.nookaapi.shared.entity;

import static org.assertj.core.api.Assertions.assertThat;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.spot.entity.City;
import com.vinhung.nookaapi.user.entity.User;
import jakarta.persistence.EntityManager;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * UUID v4 hoàn toàn ngẫu nhiên nên mỗi lần chèn rơi vào một trang lá ngẫu nhiên
 * của B-tree: index phình, trang tách liên tục, WAL phồng. UUID v7 nhét mốc
 * thời gian vào đầu nên chèn dồn về mép phải.
 *
 * <p>Test này cũng khoá một cái bẫy: {@code Style.TIME} của Hibernate KHÔNG
 * phải v7 — nó là v1 và nhúng địa chỉ IP/MAC của máy chủ vào id. Trong một app
 * lấy privacy làm ràng buộc sản phẩm thì đó là lỗi nghiêm trọng, và nó sẽ đi
 * lọt vì tên hằng số nghe rất hợp lý.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class BaseEntityIdTest {

    @Autowired
    private EntityManager em;

    @Test
    @DisplayName("Id sinh ra là UUID version 7")
    void generatedIdIsVersion7() {
        User user = User.builder()
                .email("uuid-probe@example.test")
                .passwordHash("unused")
                .username("uuidprobe")
                .displayName("uuid probe")
                .build();
        em.persist(user);
        em.flush();

        assertThat(user.getId().version()).isEqualTo(7);
    }

    @Test
    @DisplayName("Id sinh liên tiếp tăng dần theo thời gian")
    void generatedIdsAreTimeOrdered() {
        City first = persistCity("first");
        City second = persistCity("second");

        // v7 xếp mốc thời gian ở 48 bit đầu, nên so sánh không dấu theo thứ tự
        // byte cho ra đúng thứ tự thời gian. So bằng chuỗi hex là cách đọc
        // 48 bit đó mà không phải tự dịch bit.
        assertThat(first.getId().toString()).isLessThan(second.getId().toString());
    }

    @Test
    @DisplayName("Id vẫn là variant chuẩn IETF")
    void generatedIdKeepsIetfVariant() {
        City city = persistCity("variant");

        assertThat(city.getId().variant()).isEqualTo(2);
    }

    private City persistCity(String name) {
        City city = City.builder().name(name).countryCode("VN").build();
        em.persist(city);
        em.flush();
        return city;
    }
}
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```powershell
.\mvnw.cmd "-Dtest=BaseEntityIdTest" test
```

Kết quả mong đợi: `generatedIdIsVersion7` FAIL với `expected: 7 but was: 4`. `generatedIdsAreTimeOrdered` cũng nhiều khả năng FAIL vì id v4 ngẫu nhiên.

- [ ] **Step 3: Đổi generator trong `BaseEntity`**

Sửa `src/main/java/com/vinhung/nookaapi/shared/entity/BaseEntity.java`.

Bỏ hai import không còn dùng:

```java
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
```

Thêm import:

```java
import org.hibernate.annotations.UuidGenerator;
```

Thay khối `@Id`:

```java
    /**
     * UUID v7 chứ không phải v4: mốc thời gian nằm ở 48 bit đầu nên bản ghi mới
     * dồn về mép phải của B-tree thay vì rơi ngẫu nhiên khắp index.
     *
     * <p>KHÔNG dùng {@code Style.TIME} — nó là UUID v1 và nhúng địa chỉ IP/MAC
     * của máy chủ vào id.
     *
     * <p>{@code VERSION_7} đang là {@code @Incubating} trong Hibernate. Nếu API
     * đổi khi nâng version, đây là chỗ duy nhất phải sửa.
     */
    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;
```

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

```powershell
.\mvnw.cmd "-Dtest=BaseEntityIdTest" test
```

Kết quả mong đợi: PASS cả ba.

Nếu compile lỗi `cannot find symbol: VERSION_7`, kiểm lại version Hibernate mà Spring Boot 4.1.0 quản lý và tra Context7 trên `/hibernate/hibernate-orm` cho enum `UuidGenerator.Style` trước khi sửa tiếp. Không tự đoán tên hằng số khác.

- [ ] **Step 5: Chạy toàn bộ test**

```powershell
.\mvnw.cmd test
```

Kết quả mong đợi: PASS toàn bộ. Thay đổi này chạm mọi entity nên đây là chỗ phải chạy đủ, không chạy lẻ.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/com/vinhung/nookaapi/shared/entity/BaseEntity.java src/test/java/com/vinhung/nookaapi/shared/entity/BaseEntityIdTest.java
git commit -m "feat(db): generate time-ordered UUIDv7 identifiers"
```

---

## Task 3: `cities.timezone`

**Files:**
- Create: `src/main/resources/db/migration/V3_2__city_timezone.sql`
- Create: `src/test/java/com/vinhung/nookaapi/spot/CityTimezoneTest.java`
- Modify: `src/main/java/com/vinhung/nookaapi/spot/entity/City.java`

**Interfaces:**
- Consumes: không có
- Produces: `City.getTimezone()` trả về `String` chứa tên IANA timezone, mặc định `"Asia/Ho_Chi_Minh"`. Dùng để tính "quán đang mở hay đóng" từ `spot_hours` ở Task 9.

---

- [ ] **Step 1: Viết test thất bại**

Tạo `src/test/java/com/vinhung/nookaapi/spot/CityTimezoneTest.java`:

```java
package com.vinhung.nookaapi.spot;

import static org.assertj.core.api.Assertions.assertThat;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.spot.entity.City;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * Trang quán hiện "Open · until 10pm". Muốn biết BÂY GIỜ có mở không thì phải
 * so giờ hiện tại theo giờ địa phương của thành phố, không phải giờ server.
 * Thiếu cột này thì mở rộng ra Bangkok là sai giờ toàn bộ.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class CityTimezoneTest {

    @Autowired
    private EntityManager em;

    @Test
    @DisplayName("Thành phố mới mặc định múi giờ Việt Nam")
    void newCityDefaultsToVietnamTimezone() {
        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        em.flush();
        em.clear();

        City reloaded = em.find(City.class, city.getId());

        assertThat(reloaded.getTimezone()).isEqualTo("Asia/Ho_Chi_Minh");
    }

    @Test
    @DisplayName("Múi giờ đặt tường minh được giữ nguyên")
    void explicitTimezoneIsKept() {
        City city = City.builder()
                .name("Bangkok")
                .countryCode("TH")
                .timezone("Asia/Bangkok")
                .build();
        em.persist(city);
        em.flush();
        em.clear();

        assertThat(em.find(City.class, city.getId()).getTimezone()).isEqualTo("Asia/Bangkok");
    }
}
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```powershell
.\mvnw.cmd "-Dtest=CityTimezoneTest" test
```

Kết quả mong đợi: FAIL lúc compile — `cannot find symbol: method timezone(String)` và `cannot find symbol: method getTimezone()`.

- [ ] **Step 3: Viết migration**

Tạo `src/main/resources/db/migration/V3_2__city_timezone.sql`:

```sql
-- Mục 6.3 của spec.
--
-- Giờ mở cửa ở V3_7 lưu kiểu `time` không có timezone, vì "mở 7 giờ sáng" là
-- một câu nói về giờ địa phương chứ không phải một thời điểm tuyệt đối. Muốn
-- đổi nó thành thời điểm tuyệt đối để so với `now()` thì cần biết địa phương
-- nào — cột này là chỗ giữ câu trả lời đó.
--
-- Mặc định là TP.HCM vì §11 khoá khu vực khởi điểm ở Quận 1, Quận 3 và
-- Bình Thạnh.

alter table cities add column timezone text not null default 'Asia/Ho_Chi_Minh';
```

- [ ] **Step 4: Thêm cột vào entity `City`**

Sửa `src/main/java/com/vinhung/nookaapi/spot/entity/City.java`. Thêm import:

```java
import lombok.Builder;
```

Thêm field sau `countryCode`:

```java
    /**
     * Tên timezone theo IANA, ví dụ {@code Asia/Ho_Chi_Minh}. Dùng để đổi giờ
     * mở cửa (lưu dạng giờ địa phương) thành thời điểm tuyệt đối khi so với
     * hiện tại.
     */
    @Column(nullable = false)
    @Builder.Default
    private String timezone = "Asia/Ho_Chi_Minh";
```

- [ ] **Step 5: Chạy test để chắc chắn nó xanh**

```powershell
.\mvnw.cmd "-Dtest=CityTimezoneTest" test
```

Kết quả mong đợi: PASS cả hai.

- [ ] **Step 6: Commit**

```bash
git add src/main/resources/db/migration/V3_2__city_timezone.sql src/main/java/com/vinhung/nookaapi/spot/entity/City.java src/test/java/com/vinhung/nookaapi/spot/CityTimezoneTest.java
git commit -m "feat(spot): add city timezone for local opening hours"
```

---

## Task 4: `users` — cột hồ sơ và xoá tài khoản

**Files:**
- Create: `src/main/resources/db/migration/V3_3__user_profile.sql`
- Create: `src/test/java/com/vinhung/nookaapi/user/entity/UserProfileColumnsTest.java`
- Modify: `src/main/java/com/vinhung/nookaapi/user/entity/User.java`

**Interfaces:**
- Consumes: không có
- Produces: `User.getBio()`, `User.getHomeAreaId()` (`UUID`), `User.getLocale()` (`String`), `User.isShowActivityStatus()` (`boolean`), `User.getDeletedAt()` (`Instant`), `User.getAnonymizedAt()` (`Instant`), cùng setter tương ứng. Task 5 dùng `setDeletedAt` để dựng dữ liệu test cho R9.

---

- [ ] **Step 1: Viết test thất bại**

Tạo `src/test/java/com/vinhung/nookaapi/user/entity/UserProfileColumnsTest.java`:

```java
package com.vinhung.nookaapi.user.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.spot.entity.Area;
import com.vinhung.nookaapi.spot.entity.City;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bốn cột hồ sơ đến từ `app/edit-profile.tsx` và `app/(tabs)/profile.tsx`;
 * hai cột xoá tài khoản đến từ mục 12.2 của spec.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class UserProfileColumnsTest {

    @Autowired
    private EntityManager em;

    @Test
    @DisplayName("Tài khoản mới mặc định locale vi, bật hiện trạng thái, chưa xoá")
    void newUserHasSensibleDefaults() {
        User user = persistUser("defaults");
        em.clear();

        User reloaded = em.find(User.class, user.getId());

        assertThat(reloaded.getLocale()).isEqualTo("vi");
        assertThat(reloaded.isShowActivityStatus()).isTrue();
        assertThat(reloaded.getDeletedAt()).isNull();
        assertThat(reloaded.getAnonymizedAt()).isNull();
        assertThat(reloaded.getBio()).isNull();
        assertThat(reloaded.getHomeAreaId()).isNull();
    }

    @Test
    @DisplayName("Bio giữ được xuống dòng")
    void bioKeepsLineBreaks() {
        User user = persistUser("bio");
        user.setBio("Sits three hours, orders one coffee.\nQuiet corners in D1.");
        em.flush();
        em.clear();

        assertThat(em.find(User.class, user.getId()).getBio())
                .isEqualTo("Sits three hours, orders one coffee.\nQuiet corners in D1.");
    }

    @Test
    @DisplayName("Bio dài quá 300 ký tự bị database từ chối")
    void bioLongerThanThreeHundredCharactersIsRejected() {
        User user = persistUser("longbio");
        user.setBio("x".repeat(301));

        assertThatThrownBy(() -> em.flush())
                .hasMessageContaining("users_bio_length");
    }

    @Test
    @DisplayName("Bio đúng 300 ký tự được chấp nhận")
    void bioOfExactlyThreeHundredCharactersIsAccepted() {
        User user = persistUser("maxbio");
        user.setBio("x".repeat(300));
        em.flush();
        em.clear();

        assertThat(em.find(User.class, user.getId()).getBio()).hasSize(300);
    }

    @Test
    @DisplayName("home_area_id trỏ được vào một area có thật")
    void homeAreaIdReferencesAnExistingArea() {
        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        Area area = Area.builder().city(city).name("Binh Thanh").build();
        em.persist(area);

        User user = persistUser("located");
        user.setHomeAreaId(area.getId());
        em.flush();
        em.clear();

        assertThat(em.find(User.class, user.getId()).getHomeAreaId()).isEqualTo(area.getId());
    }

    @Test
    @DisplayName("Đánh dấu xoá và ẩn danh ghi được")
    void deletionTimestampsArePersisted() {
        User user = persistUser("deleted");
        Instant now = Instant.now();
        user.setDeletedAt(now);
        user.setAnonymizedAt(now);
        em.flush();
        em.clear();

        User reloaded = em.find(User.class, user.getId());
        assertThat(reloaded.getDeletedAt()).isNotNull();
        assertThat(reloaded.getAnonymizedAt()).isNotNull();
    }

    private User persistUser(String username) {
        User user = User.builder()
                .email(username + "@example.test")
                .passwordHash("unused")
                .username(username)
                .displayName(username)
                .build();
        em.persist(user);
        em.flush();
        return user;
    }
}
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```powershell
.\mvnw.cmd "-Dtest=UserProfileColumnsTest" test
```

Kết quả mong đợi: FAIL lúc compile — không có `getBio`, `setBio`, `getHomeAreaId`, `setHomeAreaId`, `getLocale`, `isShowActivityStatus`, `getDeletedAt`, `setDeletedAt`, `getAnonymizedAt`, `setAnonymizedAt`.

- [ ] **Step 3: Viết migration**

Tạo `src/main/resources/db/migration/V3_3__user_profile.sql`:

```sql
-- Mục 6.2 của spec.
--
-- Bốn cột đầu đến từ frontend: `editProfile.location` là "Your district or
-- city" nên home_area_id trỏ vào areas (area chính là quận); profile.meta là
-- "Binh Thanh · joined Mar 2026" và nửa sau lấy từ created_at đã có.
--
-- locale cần vì email xác thực và push notification do server gửi — server
-- phải biết viết tiếng gì.
--
-- Hai cột cuối phục vụ xoá tài khoản hai bước ở mục 12.2: deleted_at ẩn ngay,
-- anonymized_at đánh dấu PII đã bị xoá thật sau thời gian ân hạn. Ân hạn tồn
-- tại để xử lý việc xoá tài khoản trong lúc giận rồi hôm sau muốn quay lại.
--
-- KHÔNG thêm cột counter cho "128 check-in / 34 đã đi / 19 muốn đi" ở trang cá
-- nhân. Mục 4.3 chốt đếm lúc đọc qua module insight.
--
-- KHÔNG thêm cột last_seen_at. Cập nhật nó mỗi request nghĩa là mỗi lần user
-- chạm app là một lượt ghi vào bảng bận nhất hệ thống. Hiện diện ứng dụng nằm
-- ở Redis với TTL 2 phút (mục 5.4); Postgres chỉ giữ công tắc bật/tắt.

alter table users
    add column bio                  text,
    add column home_area_id         uuid references areas on delete set null,
    add column locale               varchar(5) not null default 'vi',
    add column show_activity_status boolean    not null default true,
    add column deleted_at           timestamptz,
    add column anonymized_at        timestamptz;

alter table users add constraint users_bio_length
    check (bio is null or length(bio) <= 300);

-- Truy vấn hồ sơ theo khu vực (§11 đo mật độ theo quận).
create index users_home_area_idx on users (home_area_id)
    where home_area_id is not null;

-- Mọi truy vấn user đang hoạt động đều lọc cột này, nên nó cần index riêng.
create index users_active_idx on users (id) where deleted_at is null;
```

- [ ] **Step 4: Thêm cột vào entity `User`**

Sửa `src/main/java/com/vinhung/nookaapi/user/entity/User.java`. Thêm import:

```java
import java.util.UUID;
```

Thêm các field sau `avatarUrl` và trước `defaultPostVisibility`:

```java
    @Column(columnDefinition = "text")
    private String bio;

    /**
     * Quận hoặc thành phố người dùng khai ở `editProfile.location`. Giữ dạng
     * UUID chứ không phải association vì `user` không được phụ thuộc entity của
     * module `spot`.
     */
    @Column(name = "home_area_id")
    private UUID homeAreaId;

    /** Ngôn ngữ server dùng khi gửi email và push notification cho người này. */
    @Column(nullable = false, length = 5)
    @lombok.Builder.Default
    private String locale = "vi";

    /** Công tắc tắt chấm xanh "đang online" ở màn chat. */
    @Column(name = "show_activity_status", nullable = false)
    @lombok.Builder.Default
    private boolean showActivityStatus = true;

    /**
     * Bước 1 của xoá tài khoản: ẩn khỏi mọi bề mặt ngay lập tức.
     *
     * <p>Bài viết của tài khoản có cột này khác null phải biến mất khỏi feed
     * của mọi người — xem R9 và {@code PostVisibilityRules}.
     */
    @Column(name = "deleted_at")
    private Instant deletedAt;

    /** Bước 2: PII đã bị xoá thật sau thời gian ân hạn. */
    @Column(name = "anonymized_at")
    private Instant anonymizedAt;
```

- [ ] **Step 5: Chạy test để chắc chắn nó xanh**

```powershell
.\mvnw.cmd "-Dtest=UserProfileColumnsTest" test
```

Kết quả mong đợi: PASS cả sáu.

Nếu `bioLongerThanThreeHundredCharactersIsRejected` báo lỗi khác `users_bio_length`, in ra toàn bộ chuỗi exception để xem constraint nào bị vi phạm — có thể tên constraint bị Postgres rút gọn.

- [ ] **Step 6: Commit**

```bash
git add src/main/resources/db/migration/V3_3__user_profile.sql src/main/java/com/vinhung/nookaapi/user/entity/User.java src/test/java/com/vinhung/nookaapi/user/entity/UserProfileColumnsTest.java
git commit -m "feat(user): add profile fields and two-step account deletion columns"
```

---

## Task 5: R9 — bài của tài khoản đã xoá biến mất với mọi người

Không có migration. Đây là **thay đổi luật visibility**, nên `AGENTS.md` bắt buộc viết test trước — đúng thứ tự của plan này.

Task 4 vừa tạo ra một trạng thái chưa từng tồn tại: **bài viết còn nguyên, tác giả đã ẩn.** `PostVisibilityRules.visibleTo()` hiện chỉ kiểm `posts.deleted_at`, nên nếu không sửa thì bài của tài khoản đã xoá vẫn nằm trong feed người khác — đúng thứ bước 1 của việc xoá định chặn.

Module `post` **không được** import `user.entity.User` (ArchUnit rule `postDoesNotDependOnOtherModuleEntities`). Nên phép kiểm phải đi qua `user.query.RelationshipCriteria`, đúng đường mà `followExists` và `blockExists` đã đi.

**Files:**
- Modify: `src/main/java/com/vinhung/nookaapi/user/query/RelationshipCriteria.java`
- Modify: `src/main/java/com/vinhung/nookaapi/user/query/JpaRelationshipCriteria.java`
- Modify: `src/main/java/com/vinhung/nookaapi/post/repository/PostVisibilityRules.java`
- Modify: `src/test/java/com/vinhung/nookaapi/post/PostVisibilityRulesTest.java`

**Interfaces:**
- Consumes: `User.setDeletedAt(Instant)` từ Task 4.
- Produces: `RelationshipCriteria.deletedAuthorExists(CriteriaQuery<?> query, CriteriaBuilder builder, Path<UUID> authorId)` trả `Subquery<Integer>`. Chú ý nó **không** nhận `viewerId` — trạng thái xoá của tác giả không phụ thuộc người xem.

---

- [ ] **Step 1: Viết test thất bại**

Thêm hai test vào `src/test/java/com/vinhung/nookaapi/post/PostVisibilityRulesTest.java`, đặt ngay sau `softDeletedPostIsInvisibleToEveryone`:

```java
    @Test
    @DisplayName("R9: bài của tài khoản đã xoá biến mất với mọi người, kể cả chính tác giả")
    void postsOfDeletedAuthorAreInvisibleToEveryone() {
        Post publicPost = persistPost(Visibility.PUBLIC);

        em.find(User.class, author.getId()).setDeletedAt(java.time.Instant.now());
        em.flush();
        em.clear();

        assertThat(visibleTo(author)).doesNotContain(publicPost.getId());
        assertThat(visibleTo(follower)).doesNotContain(publicPost.getId());
        assertThat(visibleTo(stranger)).doesNotContain(publicPost.getId());
        assertThat(visibleTo(null)).doesNotContain(publicPost.getId());
    }

    @Test
    @DisplayName("R9: bỏ đánh dấu xoá thì bài hiện lại")
    void postsReappearWhenAuthorDeletionIsUndone() {
        Post publicPost = persistPost(Visibility.PUBLIC);

        User managed = em.find(User.class, author.getId());
        managed.setDeletedAt(java.time.Instant.now());
        em.flush();
        em.clear();
        assertThat(visibleTo(stranger)).doesNotContain(publicPost.getId());

        em.find(User.class, author.getId()).setDeletedAt(null);
        em.flush();
        em.clear();

        assertThat(visibleTo(stranger)).contains(publicPost.getId());
    }

    @Test
    @DisplayName("R9: xoá tài khoản người khác không làm mất bài của tác giả")
    void deletingAnotherAccountDoesNotHideThisAuthorsPosts() {
        Post publicPost = persistPost(Visibility.PUBLIC);

        em.find(User.class, stranger.getId()).setDeletedAt(java.time.Instant.now());
        em.flush();
        em.clear();

        assertThat(visibleTo(follower)).contains(publicPost.getId());
    }
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```powershell
.\mvnw.cmd "-Dtest=PostVisibilityRulesTest" test
```

Kết quả mong đợi: `postsOfDeletedAuthorAreInvisibleToEveryone` và `postsReappearWhenAuthorDeletionIsUndone` FAIL — bài vẫn hiện với người lạ. `deletingAnotherAccountDoesNotHideThisAuthorsPosts` PASS ngay từ đầu (nó là bảo hiểm chống sửa quá tay ở bước sau).

- [ ] **Step 3: Thêm method vào `RelationshipCriteria`**

Sửa `src/main/java/com/vinhung/nookaapi/user/query/RelationshipCriteria.java`, thêm method sau `blockExists`:

```java
    /**
     * Tác giả có đang bị đánh dấu xoá tài khoản không.
     *
     * <p>Không nhận {@code viewerId}: trạng thái xoá của một tài khoản giống
     * nhau với mọi người xem. Trả về subquery thay vì boolean vì nó phải nằm
     * trong cùng một câu SQL với phép lọc Post — kiểm ở tầng Java thì phải nạp
     * bài về trước rồi mới loại, và số lượng trang sẽ sai.
     */
    Subquery<Integer> deletedAuthorExists(CriteriaQuery<?> query, CriteriaBuilder builder,
            Path<UUID> authorId);
```

- [ ] **Step 4: Cài đặt trong `JpaRelationshipCriteria`**

Sửa `src/main/java/com/vinhung/nookaapi/user/query/JpaRelationshipCriteria.java`. Thêm import:

```java
import com.vinhung.nookaapi.user.entity.User;
```

Thêm method sau `blockExists`:

```java
    @Override
    public Subquery<Integer> deletedAuthorExists(CriteriaQuery<?> query, CriteriaBuilder builder,
            Path<UUID> authorId) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<User> user = subquery.from(User.class);
        return subquery.select(builder.literal(1))
                .where(builder.equal(user.get("id"), authorId),
                        builder.isNotNull(user.get("deletedAt")));
    }
```

- [ ] **Step 5: Áp R9 trong `PostVisibilityRules` ở CẢ HAI nhánh**

Sửa `src/main/java/com/vinhung/nookaapi/post/repository/PostVisibilityRules.java`. Thay toàn bộ thân method `visibleTo`:

```java
    Specification<Post> visibleTo(@Nullable UUID viewerId) {
        return (root, query, builder) -> {
            Predicate notDeleted = builder.isNull(root.get("deletedAt"));
            Path<UUID> authorId = root.get("authorId");

            // R9: tài khoản đã xoá thì bài của họ biến mất với mọi người, kể cả
            // chính họ. Phép kiểm này nằm ngoài nhánh viewerId vì nó không phụ
            // thuộc người xem — quên nó ở nhánh khách chưa đăng nhập là lỗ rò
            // to nhất, vì đó là nhánh ai cũng chạm được.
            Predicate authorActive = builder.not(builder.exists(
                    relationships.deletedAuthorExists(query, builder, authorId)));

            if (viewerId == null) {
                return builder.and(notDeleted, authorActive, isPublic(root, builder));
            }

            Predicate audience = builder.or(
                    builder.equal(authorId, viewerId),
                    isPublic(root, builder),
                    builder.and(
                            builder.equal(root.get("visibility"), Visibility.FOLLOWERS),
                            builder.exists(relationships.followExists(
                                    query, builder, viewerId, authorId))),
                    builder.and(
                            builder.equal(root.get("visibility"), Visibility.CLOSE_FRIENDS),
                            builder.exists(relationships.closeFriendExists(
                                    query, builder, viewerId, authorId))));

            return builder.and(notDeleted, authorActive, audience,
                    builder.not(builder.exists(relationships.blockExists(
                            query, builder, viewerId, authorId))));
        };
    }
```

- [ ] **Step 6: Chạy test để chắc chắn nó xanh**

```powershell
.\mvnw.cmd "-Dtest=PostVisibilityRulesTest" test
```

Kết quả mong đợi: PASS toàn bộ, gồm 11 test cũ và 3 test mới. Nếu một test cũ đỏ thì R9 đang loại nhầm — đọc lại `deletedAuthorExists`, nhiều khả năng thiếu `builder.isNotNull`.

- [ ] **Step 7: Chạy test kiến trúc để chắc chắn không phá ranh giới module**

```powershell
.\mvnw.cmd "-Dtest=ArchitectureTest,ModularityTest" test
```

Kết quả mong đợi: PASS. Đặc biệt `postDoesNotDependOnOtherModuleEntities` phải xanh — nếu đỏ thì bạn đã import `User` vào module `post` thay vì đi qua `RelationshipCriteria`.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/com/vinhung/nookaapi/user/query/RelationshipCriteria.java src/main/java/com/vinhung/nookaapi/user/query/JpaRelationshipCriteria.java src/main/java/com/vinhung/nookaapi/post/repository/PostVisibilityRules.java src/test/java/com/vinhung/nookaapi/post/PostVisibilityRulesTest.java
git commit -m "fix(post): hide posts of soft-deleted authors from every viewer"
```

---

## Task 6: `spots.source` — nguồn gốc của địa điểm

**Files:**
- Create: `src/main/resources/db/migration/V3_4__spot_source.sql`
- Create: `src/main/java/com/vinhung/nookaapi/spot/model/enums/SpotSource.java`
- Create: `src/test/java/com/vinhung/nookaapi/spot/SpotSourceTest.java`
- Modify: `src/main/java/com/vinhung/nookaapi/spot/entity/Spot.java`

**Interfaces:**
- Consumes: không có
- Produces: enum `com.vinhung.nookaapi.spot.model.enums.SpotSource` với đúng hai hằng số `USER_CREATED` và `SEEDED`. `Spot.getSource()` / `Spot.setSource(SpotSource)`.

**Ghi chú vị trí package:** entity của module `spot` đang nằm ở `spot/entity/` (kiểu cũ), nhưng `AGENTS.md` quy định feature mới dùng `model/enums/`. Enum này là thứ mới nên đặt ở `spot/model/enums/`; **không** di chuyển entity đang có — đó là refactor ngoài phạm vi.

---

- [ ] **Step 1: Viết test thất bại**

Tạo `src/test/java/com/vinhung/nookaapi/spot/SpotSourceTest.java`:

```java
package com.vinhung.nookaapi.spot;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.spot.entity.Area;
import com.vinhung.nookaapi.spot.entity.City;
import com.vinhung.nookaapi.spot.entity.Place;
import com.vinhung.nookaapi.spot.entity.Spot;
import com.vinhung.nookaapi.spot.model.enums.SpotSource;
import com.vinhung.nookaapi.user.entity.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * §7 chốt: "User-created + seed thủ công. Không dùng Google Places API làm
 * nguồn dữ liệu gốc."
 *
 * <p>Việc enum KHÔNG có giá trị GOOGLE, và việc check constraint từ chối chuỗi
 * 'GOOGLE', chính là thứ chặn người sau vô tình thêm vào. Điều khoản của Google
 * Maps Platform cấm lưu Content của họ; key và billing project là một, nên vi
 * phạm là mất luôn bản đồ và tính năng chỉ đường.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class SpotSourceTest {

    @Autowired
    private EntityManager em;

    private Area area;
    private User creator;

    @BeforeEach
    void setUp() {
        creator = User.builder()
                .email("creator@example.test")
                .passwordHash("unused")
                .username("creator")
                .displayName("creator")
                .build();
        em.persist(creator);

        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        area = Area.builder().city(city).name("Binh Thanh").build();
        em.persist(area);
        em.flush();
    }

    @Test
    @DisplayName("Spot mới mặc định là do user tạo")
    void newSpotDefaultsToUserCreated() {
        Spot spot = persistPlace("Quan ca phe");
        em.clear();

        assertThat(em.find(Spot.class, spot.getId()).getSource())
                .isEqualTo(SpotSource.USER_CREATED);
    }

    @Test
    @DisplayName("Spot do đội seed tạo đánh dấu được")
    void seededSpotIsMarked() {
        Spot spot = Place.builder()
                .name("Quan seed")
                .area(area)
                .createdById(creator.getId())
                .source(SpotSource.SEEDED)
                .build();
        em.persist(spot);
        em.flush();
        em.clear();

        assertThat(em.find(Spot.class, spot.getId()).getSource()).isEqualTo(SpotSource.SEEDED);
    }

    @Test
    @DisplayName("Enum chỉ có đúng hai giá trị — không có GOOGLE")
    void sourceEnumHasExactlyTwoValues() {
        assertThat(SpotSource.values())
                .containsExactlyInAnyOrder(SpotSource.USER_CREATED, SpotSource.SEEDED);
    }

    @Test
    @DisplayName("Database từ chối nguồn GOOGLE ngay cả khi ghi bằng SQL thô")
    void databaseRejectsGoogleAsSource() {
        Spot spot = persistPlace("Quan bi doi nguon");
        em.clear();

        assertThatThrownBy(() -> {
            em.createNativeQuery("update spots set source = 'GOOGLE' where id = :id")
                    .setParameter("id", spot.getId())
                    .executeUpdate();
            em.flush();
        }).hasMessageContaining("spots_source_check");
    }

    private Spot persistPlace(String name) {
        Spot spot = Place.builder()
                .name(name)
                .area(area)
                .createdById(creator.getId())
                .build();
        em.persist(spot);
        em.flush();
        return spot;
    }
}
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```powershell
.\mvnw.cmd "-Dtest=SpotSourceTest" test
```

Kết quả mong đợi: FAIL lúc compile — không có package `spot.model.enums`.

- [ ] **Step 3: Viết migration**

Tạo `src/main/resources/db/migration/V3_4__spot_source.sql`:

```sql
-- Mục 6.4 của spec, và §7 của product spec.
--
-- §7 chốt: "User-created + seed thủ công. Không dùng Google Places API làm
-- nguồn dữ liệu gốc." Lý do §7 đưa ra: điều khoản của Google cấm xây dựng và
-- lưu trữ database địa điểm riêng từ dữ liệu của họ, tức là nó phá đúng moat
-- ở §12.
--
-- Việc danh sách này KHÔNG có 'GOOGLE' là cố ý. Đó là thứ chặn người sau vô
-- tình thêm một đường ghi dữ liệu Google vào database. Thêm giá trị đó nghĩa
-- là sửa cả spec, không phải sửa mỗi migration.

alter table spots
    add column source text not null default 'USER_CREATED'
        constraint spots_source_check check (source in ('USER_CREATED', 'SEEDED'));
```

- [ ] **Step 4: Tạo enum**

Tạo `src/main/java/com/vinhung/nookaapi/spot/model/enums/SpotSource.java`:

```java
package com.vinhung.nookaapi.spot.model.enums;

/**
 * Địa điểm đến từ đâu (§7).
 *
 * <p>Chỉ có hai giá trị, và việc thiếu {@code GOOGLE} là cố ý: §7 chốt
 * "User-created + seed thủ công. Không dùng Google Places API làm nguồn dữ liệu
 * gốc." Điều khoản của Google Maps Platform cấm lưu Content của họ; ngoại lệ
 * duy nhất là {@code place_id}, và ngay cả nó cũng chỉ được dùng làm con trỏ
 * chống trùng nếu sau này thêm autocomplete.
 */
public enum SpotSource {

    /** Do người dùng tạo trong luồng check-in. */
    USER_CREATED,

    /** Do đội seed nhập tay trước khi mở khu vực (§11). */
    SEEDED
}
```

- [ ] **Step 5: Thêm cột vào entity `Spot`**

Sửa `src/main/java/com/vinhung/nookaapi/spot/entity/Spot.java`. Thêm import:

```java
import com.vinhung.nookaapi.spot.model.enums.SpotSource;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Builder;
```

Thêm field sau `createdById`:

```java
    /** Nguồn gốc của địa điểm (§7). Không có giá trị nào cho Google. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SpotSource source = SpotSource.USER_CREATED;
```

- [ ] **Step 6: Chạy test để chắc chắn nó xanh**

```powershell
.\mvnw.cmd "-Dtest=SpotSourceTest" test
```

Kết quả mong đợi: PASS cả bốn.

- [ ] **Step 7: Commit**

```bash
git add src/main/resources/db/migration/V3_4__spot_source.sql src/main/java/com/vinhung/nookaapi/spot/model/enums/SpotSource.java src/main/java/com/vinhung/nookaapi/spot/entity/Spot.java src/test/java/com/vinhung/nookaapi/spot/SpotSourceTest.java
git commit -m "feat(spot): record spot provenance and forbid google as a source"
```

---

## Task 7: `places.geog` và cổng chống trùng

Task lớn nhất của giai đoạn, và là thứ duy nhất trong plan này tạo ra hành vi nghiệp vụ thật.

**Files:**
- Create: `src/main/resources/db/migration/V3_5__place_geography.sql`
- Create: `src/main/java/com/vinhung/nookaapi/spot/api/DuplicateSpotCandidate.java`
- Create: `src/main/java/com/vinhung/nookaapi/spot/api/SpotDuplicateFinder.java`
- Create: `src/main/java/com/vinhung/nookaapi/spot/repository/JpaSpotDuplicateFinder.java`
- Create: `src/test/java/com/vinhung/nookaapi/spot/SpotDuplicateFinderTest.java`

**Interfaces:**
- Consumes: extension `postgis` và `pg_trgm` từ Task 1; `Spot.getSource()` không dùng ở đây nhưng cùng bảng.
- Produces:
  - `record DuplicateSpotCandidate(UUID spotId, String name, double distanceMeters, double nameSimilarity)`
  - `interface SpotDuplicateFinder { List<DuplicateSpotCandidate> findNear(String name, BigDecimal latitude, BigDecimal longitude, double radiusMeters, double minSimilarity); }`

---

- [ ] **Step 1: Viết test thất bại**

Tạo `src/test/java/com/vinhung/nookaapi/spot/SpotDuplicateFinderTest.java`:

```java
package com.vinhung.nookaapi.spot;

import static org.assertj.core.api.Assertions.assertThat;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.spot.api.DuplicateSpotCandidate;
import com.vinhung.nookaapi.spot.api.SpotDuplicateFinder;
import com.vinhung.nookaapi.spot.entity.Area;
import com.vinhung.nookaapi.spot.entity.City;
import com.vinhung.nookaapi.spot.entity.Place;
import com.vinhung.nookaapi.spot.entity.Spot;
import com.vinhung.nookaapi.user.entity.User;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * §7: "cần cơ chế chống trùng place ngay từ đầu (so tên + tọa độ trong bán
 * kính, gợi ý merge), vì user tạo place tự do sẽ sinh ra bản trùng."
 *
 * <p>Hai điều kiện phải cùng đúng. Chỉ so tên thì hai chi nhánh của một chuỗi
 * cách nhau 5km bị coi là trùng; chỉ so toạ độ thì quán cà phê cạnh tiệm bánh
 * mì bị coi là trùng.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class SpotDuplicateFinderTest {

    /** Toạ độ The Workshop Coffee, lấy từ features/nooka/spots.ts. */
    private static final BigDecimal LAT = new BigDecimal("10.772560");
    private static final BigDecimal LNG = new BigDecimal("106.704280");

    @Autowired
    private EntityManager em;

    @Autowired
    private SpotDuplicateFinder finder;

    private Area area;
    private User creator;

    @BeforeEach
    void setUp() {
        creator = User.builder()
                .email("dup-creator@example.test")
                .passwordHash("unused")
                .username("dupcreator")
                .displayName("dup creator")
                .build();
        em.persist(creator);

        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        area = Area.builder().city(city).name("District 1").build();
        em.persist(area);
        em.flush();
    }

    @Test
    @DisplayName("Tên gần giống trong bán kính bị coi là ứng viên trùng")
    void similarNameWithinRadiusIsFound() {
        Spot existing = persistPlace("The Workshop Coffee", LAT, LNG);
        em.flush();
        em.clear();

        List<DuplicateSpotCandidate> found =
                finder.findNear("Workshop Coffee", LAT, LNG, 150, 0.3);

        assertThat(found).extracting(DuplicateSpotCandidate::spotId).contains(existing.getId());
    }

    @Test
    @DisplayName("Cùng tên nhưng ngoài bán kính thì không phải trùng")
    void sameNameOutsideRadiusIsNotFound() {
        // 0.01 độ vĩ ≈ 1.1km, vượt xa bán kính 150m.
        persistPlace("The Workshop Coffee", LAT.add(new BigDecimal("0.010000")), LNG);
        em.flush();
        em.clear();

        List<DuplicateSpotCandidate> found =
                finder.findNear("The Workshop Coffee", LAT, LNG, 150, 0.3);

        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("Cùng toạ độ nhưng tên khác hẳn thì không phải trùng")
    void differentNameAtSameCoordinateIsNotFound() {
        persistPlace("Banh mi Huynh Hoa", LAT, LNG);
        em.flush();
        em.clear();

        List<DuplicateSpotCandidate> found =
                finder.findNear("The Workshop Coffee", LAT, LNG, 150, 0.3);

        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("So tên không phân biệt hoa thường")
    void nameComparisonIgnoresCase() {
        Spot existing = persistPlace("THE WORKSHOP COFFEE", LAT, LNG);
        em.flush();
        em.clear();

        List<DuplicateSpotCandidate> found =
                finder.findNear("the workshop coffee", LAT, LNG, 150, 0.3);

        assertThat(found).extracting(DuplicateSpotCandidate::spotId).contains(existing.getId());
    }

    @Test
    @DisplayName("Spot đã bị gộp không còn là ứng viên trùng")
    void mergedSpotIsExcluded() {
        Spot winner = persistPlace("The Workshop Coffee", LAT, LNG);
        Spot loser = persistPlace("The Workshop Coffee", LAT, LNG);
        loser.setMergedInto(winner);
        em.flush();
        em.clear();

        List<DuplicateSpotCandidate> found =
                finder.findNear("The Workshop Coffee", LAT, LNG, 150, 0.3);

        assertThat(found).extracting(DuplicateSpotCandidate::spotId)
                .contains(winner.getId())
                .doesNotContain(loser.getId());
    }

    @Test
    @DisplayName("Kết quả xếp theo khoảng cách tăng dần và mang khoảng cách thật")
    void resultsAreOrderedByDistanceAndCarryRealDistance() {
        // 0.00090 độ vĩ ≈ 100m; 0.00027 độ vĩ ≈ 30m.
        Spot far = persistPlace("Workshop Coffee Xa", LAT.add(new BigDecimal("0.000900")), LNG);
        Spot near = persistPlace("Workshop Coffee Gan", LAT.add(new BigDecimal("0.000270")), LNG);
        em.flush();
        em.clear();

        List<DuplicateSpotCandidate> found =
                finder.findNear("Workshop Coffee", LAT, LNG, 150, 0.3);

        assertThat(found).extracting(DuplicateSpotCandidate::spotId)
                .containsExactly(near.getId(), far.getId());
        assertThat(found.get(0).distanceMeters()).isBetween(20.0, 45.0);
        assertThat(found.get(1).distanceMeters()).isBetween(85.0, 115.0);
    }

    @Test
    @DisplayName("Không có gì trong bán kính thì trả về danh sách rỗng, không ném lỗi")
    void emptyDatabaseReturnsEmptyList() {
        List<DuplicateSpotCandidate> found =
                finder.findNear("Quan chua ai tao", LAT, LNG, 150, 0.3);

        assertThat(found).isEmpty();
    }

    private Spot persistPlace(String name, BigDecimal latitude, BigDecimal longitude) {
        Place place = Place.builder()
                .name(name)
                .area(area)
                .createdById(creator.getId())
                .latitude(latitude)
                .longitude(longitude)
                .build();
        em.persist(place);
        return place;
    }
}
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```powershell
.\mvnw.cmd "-Dtest=SpotDuplicateFinderTest" test
```

Kết quả mong đợi: FAIL lúc compile — không có package `spot.api` chứa `SpotDuplicateFinder`.

- [ ] **Step 3: Viết migration**

Tạo `src/main/resources/db/migration/V3_5__place_geography.sql`:

```sql
-- Mục 6.4 của spec.
--
-- latitude/longitude vẫn là numeric(9,6) và vẫn là nguồn sự thật. Lý do ở
-- V1__baseline.sql: "sai số dấu phẩy động ở vĩ độ là sai số vị trí thật."
--
-- geog là cột SINH TỰ ĐỘNG, không phải cột thường. Không có đường ghi nào vào
-- nó nên nó không thể lệch với lat/lng — khác hẳn một cột thường phải nhớ cập
-- nhật ở mọi chỗ.
--
-- Ép kiểu double precision là tường minh: numeric -> double precision là phép
-- ép immutable, và generated column bắt buộc toàn bộ biểu thức phải immutable.
--
-- Hibernate không cần biết cột này. `ddl-auto=validate` chỉ kiểm rằng mọi
-- property của entity có cột tương ứng; cột thừa trong database thì bỏ qua.

alter table places add column geog geography(Point, 4326)
    generated always as (
        ST_SetSRID(ST_MakePoint(longitude::double precision,
                                latitude::double precision), 4326)::geography
    ) stored;

-- GiST cho ST_DWithin: thu hẹp theo bán kính trước, rồi mới so tên.
create index places_geog_idx on places using gist (geog);

-- GIN trigram cho so tên gần giống.
--
-- Lưu ý: `similarity(a, b) > x` KHÔNG dùng được index này; chỉ toán tử `%`
-- (với pg_trgm.similarity_threshold) mới dùng được. Ở đây điều đó chấp nhận
-- được vì ST_DWithin đã thu hẹp xuống vài địa điểm trước khi so tên. Index vẫn
-- được tạo cho universal search ở §6.1 product spec, nơi tìm theo tên không có
-- ràng buộc bán kính.
create index spots_name_trgm_idx on spots using gin (lower(name) gin_trgm_ops);
```

- [ ] **Step 4: Tạo record kết quả**

Tạo `src/main/java/com/vinhung/nookaapi/spot/api/DuplicateSpotCandidate.java`:

```java
package com.vinhung.nookaapi.spot.api;

import java.util.UUID;

/**
 * Một địa điểm có thể trùng với địa điểm người dùng sắp tạo.
 *
 * @param spotId         id của địa điểm đã có
 * @param name           tên đã lưu, để hiện "Có phải bạn muốn nói quán này?"
 * @param distanceMeters khoảng cách thật tính bằng mét
 * @param nameSimilarity độ giống tên trong khoảng 0..1 do pg_trgm chấm
 */
public record DuplicateSpotCandidate(
        UUID spotId,
        String name,
        double distanceMeters,
        double nameSimilarity) {
}
```

- [ ] **Step 5: Tạo interface cổng**

Tạo `src/main/java/com/vinhung/nookaapi/spot/api/SpotDuplicateFinder.java`:

```java
package com.vinhung.nookaapi.spot.api;

import java.math.BigDecimal;
import java.util.List;

/**
 * Cổng chống trùng place, yêu cầu của §7:
 * "cần cơ chế chống trùng place ngay từ đầu (so tên + tọa độ trong bán kính,
 * gợi ý merge)".
 *
 * <p>Đặt ở {@code api} và cài đặt package-private trong {@code repository},
 * cùng khuôn với {@code post.api.PostAccess}: nơi gọi chỉ thấy interface, nên
 * đổi cách so trùng về sau không lan ra ngoài module.
 */
public interface SpotDuplicateFinder {

    /**
     * Tìm địa điểm chưa bị gộp, nằm trong bán kính và có tên đủ giống.
     *
     * <p>Hai điều kiện phải cùng đúng. Chỉ so tên thì hai chi nhánh của một
     * chuỗi cách nhau 5km bị coi là trùng; chỉ so toạ độ thì quán cà phê cạnh
     * tiệm bánh mì bị coi là trùng.
     *
     * @param name          tên người dùng vừa gõ
     * @param latitude      vĩ độ điểm mới
     * @param longitude     kinh độ điểm mới
     * @param radiusMeters  bán kính tính bằng mét; 150 là giá trị dùng ở luồng tạo spot
     * @param minSimilarity ngưỡng giống tên 0..1; 0.3 là giá trị dùng ở luồng tạo spot
     * @return danh sách ứng viên, gần nhất trước; rỗng nếu không có
     */
    List<DuplicateSpotCandidate> findNear(
            String name,
            BigDecimal latitude,
            BigDecimal longitude,
            double radiusMeters,
            double minSimilarity);
}
```

- [ ] **Step 6: Cài đặt bằng native query**

Tạo `src/main/java/com/vinhung/nookaapi/spot/repository/JpaSpotDuplicateFinder.java`:

```java
package com.vinhung.nookaapi.spot.repository;

import com.vinhung.nookaapi.spot.api.DuplicateSpotCandidate;
import com.vinhung.nookaapi.spot.api.SpotDuplicateFinder;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Native query vì cả {@code ST_DWithin} lẫn {@code similarity} đều không có
 * trong JPQL, và thêm hibernate-spatial chỉ để diễn đạt hai hàm này là thêm
 * dependency cho một việc mà một câu SQL làm xong.
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
class JpaSpotDuplicateFinder implements SpotDuplicateFinder {

    private static final String SQL = """
            select s.id,
                   s.name,
                   ST_Distance(p.geog, :origin) as distance_m,
                   similarity(lower(s.name), lower(:name)) as name_similarity
            from spots s
            join places p on p.spot_id = s.id
            where s.merged_into_id is null
              and p.geog is not null
              and ST_DWithin(p.geog, :origin, :radius)
              and similarity(lower(s.name), lower(:name)) > :minSimilarity
            order by distance_m
            """;

    /**
     * Điểm gốc dựng ngay trong SQL. Truyền toạ độ dạng số rồi ghép chuỗi là mở
     * đường cho SQL injection; truyền qua tham số thì cần một kiểu Java hiểu
     * được geography, mà ta cố tình không thêm. Nên điểm được dựng bằng một
     * biểu thức con có tham số.
     */
    private static final String ORIGIN =
            "ST_SetSRID(ST_MakePoint(cast(:lng as double precision), "
                    + "cast(:lat as double precision)), 4326)::geography";

    private final EntityManager em;

    @Override
    @SuppressWarnings("unchecked")
    public List<DuplicateSpotCandidate> findNear(
            String name,
            BigDecimal latitude,
            BigDecimal longitude,
            double radiusMeters,
            double minSimilarity) {

        List<Object[]> rows = em.createNativeQuery(SQL.replace(":origin", ORIGIN))
                .setParameter("name", name)
                .setParameter("lat", latitude)
                .setParameter("lng", longitude)
                .setParameter("radius", radiusMeters)
                .setParameter("minSimilarity", minSimilarity)
                .getResultList();

        return rows.stream()
                .map(row -> new DuplicateSpotCandidate(
                        (UUID) row[0],
                        (String) row[1],
                        ((Number) row[2]).doubleValue(),
                        ((Number) row[3]).doubleValue()))
                .toList();
    }
}
```

- [ ] **Step 7: Chạy test để chắc chắn nó xanh**

```powershell
.\mvnw.cmd "-Dtest=SpotDuplicateFinderTest" test
```

Kết quả mong đợi: PASS cả bảy.

Nếu `mergedSpotIsExcluded` đỏ: `setMergedInto` cần một `em.flush()` trước `em.clear()` — kiểm lại thứ tự trong test.

Nếu một test khoảng cách đỏ với số lệch nhỏ: đừng nới khoảng assert. Kiểm lại thứ tự tham số của `ST_MakePoint` — nó nhận **(kinh độ, vĩ độ)**, ngược với cách người ta hay đọc toạ độ. Đảo hai tham số là lỗi kinh điển của PostGIS và nó cho ra khoảng cách sai hàng nghìn km chứ không phải sai vài mét, nên nếu lệch chỉ vài mét thì nguyên nhân nằm chỗ khác.

- [ ] **Step 8: Chạy test kiến trúc**

```powershell
.\mvnw.cmd "-Dtest=ArchitectureTest,ModularityTest" test
```

Kết quả mong đợi: PASS. `publicApisDoNotExposePersistence` phải xanh — `spot.api` chỉ được chứa interface và record, không import entity nào.

- [ ] **Step 9: Commit**

```bash
git add src/main/resources/db/migration/V3_5__place_geography.sql src/main/java/com/vinhung/nookaapi/spot/api/DuplicateSpotCandidate.java src/main/java/com/vinhung/nookaapi/spot/api/SpotDuplicateFinder.java src/main/java/com/vinhung/nookaapi/spot/repository/JpaSpotDuplicateFinder.java src/test/java/com/vinhung/nookaapi/spot/SpotDuplicateFinderTest.java
git commit -m "feat(spot): find duplicate places by radius and name similarity"
```

---

## Task 8: `spot_merge_candidates`

Bảng này chưa có entity: service ghi vào nó thuộc giai đoạn sau. Thứ cần chứng minh bây giờ là **constraint đang bật**, vì đó là cái giữ cho cặp trùng không sinh ra hai dòng.

**Files:**
- Create: `src/main/resources/db/migration/V3_6__spot_merge_candidates.sql`
- Create: `src/test/java/com/vinhung/nookaapi/spot/SpotMergeCandidateConstraintTest.java`

**Interfaces:**
- Consumes: bảng `spots` từ `V1`.
- Produces: bảng `spot_merge_candidates`. Không có API Java nào ở giai đoạn này.

---

- [ ] **Step 1: Viết test thất bại**

Tạo `src/test/java/com/vinhung/nookaapi/spot/SpotMergeCandidateConstraintTest.java`:

```java
package com.vinhung.nookaapi.spot;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.spot.entity.Area;
import com.vinhung.nookaapi.spot.entity.City;
import com.vinhung.nookaapi.spot.entity.Place;
import com.vinhung.nookaapi.spot.entity.Spot;
import com.vinhung.nookaapi.user.entity.User;
import jakarta.persistence.EntityManager;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cặp ứng viên luôn lưu theo thứ tự id tăng dần, ép bằng
 * {@code check (lower_spot_id < higher_spot_id)} cộng {@code unique}.
 *
 * <p>Mẹo này khiến database TỰ chặn việc (A,B) và (B,A) thành hai dòng khác
 * nhau. Không có nó thì phép chống trùng lặp lại đúng vấn đề nó đang giải.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class SpotMergeCandidateConstraintTest {

    @Autowired
    private EntityManager em;

    private Spot lower;
    private Spot higher;

    @BeforeEach
    void setUp() {
        User creator = User.builder()
                .email("merge-creator@example.test")
                .passwordHash("unused")
                .username("mergecreator")
                .displayName("merge creator")
                .build();
        em.persist(creator);

        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        Area area = Area.builder().city(city).name("District 3").build();
        em.persist(area);

        Spot first = persistPlace(area, creator.getId(), "Quan A");
        Spot second = persistPlace(area, creator.getId(), "Quan B");
        em.flush();

        // Sắp theo id để test không phụ thuộc thứ tự UUID sinh ra.
        if (first.getId().compareTo(second.getId()) < 0) {
            lower = first;
            higher = second;
        } else {
            lower = second;
            higher = first;
        }
    }

    @Test
    @DisplayName("Cặp đúng thứ tự tăng dần được chấp nhận")
    void pairInAscendingOrderIsAccepted() {
        insertCandidate(lower.getId(), higher.getId());

        Object count = em.createNativeQuery(
                        "select count(*) from spot_merge_candidates where status = 'PENDING'")
                .getSingleResult();

        assertThat(((Number) count).intValue()).isEqualTo(1);
    }

    @Test
    @DisplayName("Cặp ngược thứ tự bị database từ chối")
    void pairInDescendingOrderIsRejected() {
        assertThatThrownBy(() -> insertCandidate(higher.getId(), lower.getId()))
                .hasMessageContaining("spot_merge_candidates");
    }

    @Test
    @DisplayName("Cùng một cặp không thể có hai dòng")
    void duplicatePairIsRejected() {
        insertCandidate(lower.getId(), higher.getId());

        assertThatThrownBy(() -> insertCandidate(lower.getId(), higher.getId()))
                .hasMessageContaining("spot_merge_candidates");
    }

    @Test
    @DisplayName("Trạng thái ngoài ba giá trị cho phép bị từ chối")
    void unknownStatusIsRejected() {
        assertThatThrownBy(() ->
                em.createNativeQuery("""
                        insert into spot_merge_candidates
                            (lower_spot_id, higher_spot_id, reason, status)
                        values (:lower, :higher, 'NAME_AND_RADIUS', 'MAYBE')
                        """)
                        .setParameter("lower", lower.getId())
                        .setParameter("higher", higher.getId())
                        .executeUpdate())
                .hasMessageContaining("spot_merge_candidates");
    }

    private void insertCandidate(UUID lowerId, UUID higherId) {
        em.createNativeQuery("""
                insert into spot_merge_candidates
                    (lower_spot_id, higher_spot_id, reason, distance_m, name_similarity)
                values (:lower, :higher, 'NAME_AND_RADIUS', 42.5, 0.812)
                """)
                .setParameter("lower", lowerId)
                .setParameter("higher", higherId)
                .executeUpdate();
        em.flush();
    }

    private Spot persistPlace(Area area, UUID creatorId, String name) {
        Place place = Place.builder().name(name).area(area).createdById(creatorId).build();
        em.persist(place);
        return place;
    }
}
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```powershell
.\mvnw.cmd "-Dtest=SpotMergeCandidateConstraintTest" test
```

Kết quả mong đợi: FAIL — `relation "spot_merge_candidates" does not exist`.

- [ ] **Step 3: Viết migration**

Tạo `src/main/resources/db/migration/V3_6__spot_merge_candidates.sql`:

```sql
-- Mục 6.4 của spec.
--
-- §7: "cần cơ chế chống trùng place ngay từ đầu (so tên + tọa độ trong bán
-- kính, gợi ý merge)". V3_5 lo phần phát hiện lúc tạo; bảng này lo phần lọt
-- lưới, và cũng là chỗ dọn hậu quả của đua ghi.
--
-- Đua ghi: hai người tạo cùng một quán cùng lúc, cả hai chạy kiểm tra chống
-- trùng, cả hai thấy sạch, cả hai chèn. Có thể chặn bằng
-- unique (area_id, lower(name)), nhưng như thế thì hai chi nhánh cùng tên
-- trong một quận không tạo được — sai kiểu khó chịu hơn. Nên chấp nhận cuộc
-- đua và để job nền dọn qua bảng này.
--
-- check (lower_spot_id < higher_spot_id) cộng unique là thứ khiến database TỰ
-- chặn (A,B) và (B,A) thành hai dòng. Không có nó thì bảng chống trùng tự sinh
-- ra bản trùng của chính nó.

create table spot_merge_candidates (
    id              uuid primary key default gen_random_uuid(),
    lower_spot_id   uuid not null references spots on delete cascade,
    higher_spot_id  uuid not null references spots on delete cascade,
    reason          text not null
        constraint spot_merge_candidates_reason_check
        check (reason in ('NAME_AND_RADIUS', 'REPORTED', 'MANUAL')),
    distance_m      numeric(10, 2),
    name_similarity numeric(4, 3),
    status          text not null default 'PENDING'
        constraint spot_merge_candidates_status_check
        check (status in ('PENDING', 'MERGED', 'REJECTED')),
    detected_at     timestamptz not null default now(),
    resolved_at     timestamptz,
    resolved_by     uuid references users on delete set null,
    constraint spot_merge_candidates_order_check check (lower_spot_id < higher_spot_id),
    constraint spot_merge_candidates_pair_key unique (lower_spot_id, higher_spot_id)
);

-- Hàng đợi xử lý: chỉ quét dòng đang chờ, cũ nhất trước.
create index spot_merge_candidates_pending_idx on spot_merge_candidates (detected_at)
    where status = 'PENDING';
```

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

```powershell
.\mvnw.cmd "-Dtest=SpotMergeCandidateConstraintTest" test
```

Kết quả mong đợi: PASS cả bốn.

- [ ] **Step 5: Commit**

```bash
git add src/main/resources/db/migration/V3_6__spot_merge_candidates.sql src/test/java/com/vinhung/nookaapi/spot/SpotMergeCandidateConstraintTest.java
git commit -m "feat(spot): add merge candidate queue with ordered-pair constraint"
```

---

## Task 9: `spot_hours`

Chưa có entity, cùng lý do với Task 8.

**Files:**
- Create: `src/main/resources/db/migration/V3_7__spot_hours.sql`
- Create: `src/test/java/com/vinhung/nookaapi/spot/SpotHoursConstraintTest.java`

**Interfaces:**
- Consumes: bảng `spots` từ `V1`; `cities.timezone` từ Task 3 (dùng khi tính "đang mở hay đóng", ở giai đoạn sau).
- Produces: bảng `spot_hours`. Không có API Java nào ở giai đoạn này.

---

- [ ] **Step 1: Viết test thất bại**

Tạo `src/test/java/com/vinhung/nookaapi/spot/SpotHoursConstraintTest.java`:

```java
package com.vinhung.nookaapi.spot;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.spot.entity.Area;
import com.vinhung.nookaapi.spot.entity.City;
import com.vinhung.nookaapi.spot.entity.Place;
import com.vinhung.nookaapi.spot.entity.Spot;
import com.vinhung.nookaapi.user.entity.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * Trang quán hiện "Open · until 10pm". Giờ lưu dạng {@code time} không có
 * timezone vì "mở 7 giờ sáng" là câu nói về giờ địa phương, không phải một
 * thời điểm tuyệt đối; {@code cities.timezone} là chỗ đổi nó thành thời điểm.
 *
 * <p>Không có dòng cho một ngày nghĩa là đóng cửa ngày đó — không cần cột
 * is_closed.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class SpotHoursConstraintTest {

    @Autowired
    private EntityManager em;

    private Spot spot;

    @BeforeEach
    void setUp() {
        User creator = User.builder()
                .email("hours-creator@example.test")
                .passwordHash("unused")
                .username("hourscreator")
                .displayName("hours creator")
                .build();
        em.persist(creator);

        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        Area area = Area.builder().city(city).name("District 1").build();
        em.persist(area);

        spot = Place.builder()
                .name("The Workshop Coffee")
                .area(area)
                .createdById(creator.getId())
                .build();
        em.persist(spot);
        em.flush();
    }

    @Test
    @DisplayName("Giờ mở cửa bình thường ghi được")
    void ordinaryOpeningHoursArePersisted() {
        insertHours(1, "08:00", "22:00", "USER");

        Object count = em.createNativeQuery(
                        "select count(*) from spot_hours where spot_id = :id")
                .setParameter("id", spot.getId())
                .getSingleResult();

        assertThat(((Number) count).intValue()).isEqualTo(1);
    }

    @Test
    @DisplayName("Quán đóng cửa sau nửa đêm ghi được: closes_at nhỏ hơn opens_at")
    void overnightHoursAreAllowed() {
        insertHours(5, "18:00", "02:00", "OWNER");

        Object closes = em.createNativeQuery(
                        "select closes_at from spot_hours where spot_id = :id")
                .setParameter("id", spot.getId())
                .getSingleResult();

        assertThat(closes.toString()).startsWith("02:00");
    }

    @Test
    @DisplayName("Ngày trong tuần ngoài khoảng 0..6 bị từ chối")
    void dayOfWeekOutsideRangeIsRejected() {
        assertThatThrownBy(() -> insertHours(7, "08:00", "22:00", "USER"))
                .hasMessageContaining("spot_hours");
    }

    @Test
    @DisplayName("Nguồn ngoài ba giá trị cho phép bị từ chối")
    void unknownSourceIsRejected() {
        assertThatThrownBy(() -> insertHours(1, "08:00", "22:00", "GOOGLE"))
                .hasMessageContaining("spot_hours");
    }

    @Test
    @DisplayName("Không thể có hai khung giờ trùng nhau cùng ngày cùng giờ mở")
    void duplicateOpeningSlotIsRejected() {
        insertHours(1, "08:00", "12:00", "USER");

        assertThatThrownBy(() -> insertHours(1, "08:00", "22:00", "OWNER"))
                .hasMessageContaining("spot_hours");
    }

    @Test
    @DisplayName("Một ngày có hai ca nghỉ trưa vẫn ghi được")
    void twoShiftsOnTheSameDayAreAllowed() {
        insertHours(1, "08:00", "12:00", "USER");
        insertHours(1, "14:00", "22:00", "USER");

        Object count = em.createNativeQuery(
                        "select count(*) from spot_hours where spot_id = :id and day_of_week = 1")
                .setParameter("id", spot.getId())
                .getSingleResult();

        assertThat(((Number) count).intValue()).isEqualTo(2);
    }

    private void insertHours(int dayOfWeek, String opensAt, String closesAt, String source) {
        em.createNativeQuery("""
                insert into spot_hours (spot_id, day_of_week, opens_at, closes_at, source)
                values (:spot, :day, cast(:opens as time), cast(:closes as time), :source)
                """)
                .setParameter("spot", spot.getId())
                .setParameter("day", dayOfWeek)
                .setParameter("opens", opensAt)
                .setParameter("closes", closesAt)
                .setParameter("source", source)
                .executeUpdate();
        em.flush();
    }
}
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```powershell
.\mvnw.cmd "-Dtest=SpotHoursConstraintTest" test
```

Kết quả mong đợi: FAIL — `relation "spot_hours" does not exist`.

- [ ] **Step 3: Viết migration**

Tạo `src/main/resources/db/migration/V3_7__spot_hours.sql`:

```sql
-- Mục 6.5 của spec.
--
-- Frontend hiện "Open · until 10pm" và cần biết quán có đang mở không. Dữ liệu
-- này KHÔNG lấy từ Google: openNow là Content của Google và điều khoản của họ
-- cấm lưu. Giờ mở cửa là bảng của Nooka, do user và chủ quán đóng góp.
--
-- Không có dòng cho một ngày nghĩa là đóng cửa ngày đó. Không cần cột is_closed.
--
-- closes_at < opens_at nghĩa là đóng cửa sau nửa đêm (quán ăn khuya mở 18:00
-- đóng 02:00). Không tách thành cột riêng vì phép so sánh vẫn viết được, và
-- một cột boolean thừa là một cột nữa phải nhớ giữ đồng bộ.
--
-- Kiểu `time` chứ không phải `timestamptz`: "mở 7 giờ sáng" là một câu nói về
-- giờ địa phương, không phải một thời điểm tuyệt đối. cities.timezone ở V3_2
-- là chỗ đổi nó thành thời điểm khi cần so với now().
--
-- source tồn tại vì cùng một quán sẽ có giờ do user điền và giờ do chủ quán
-- điền sau khi claim ở giai đoạn 4. Chủ đè user — luật đó ở service, cột này
-- là thứ cho phép service biết ai điền.
--
-- Bảng này chỉ áp dụng cho spots.kind = 'PLACE'. Experience có starts_at và
-- ends_at riêng từ V1 vì nó là sự kiện có ngày giờ cụ thể, không phải lịch mở
-- cửa hàng tuần. Ràng buộc đó không diễn đạt được bằng constraint trên một
-- bảng nên ép ở service.

create table spot_hours (
    id          uuid primary key default gen_random_uuid(),
    spot_id     uuid not null references spots on delete cascade,
    -- 0 = Chủ nhật, khớp với extract(dow) của PostgreSQL.
    day_of_week smallint not null
        constraint spot_hours_day_check check (day_of_week between 0 and 6),
    opens_at    time not null,
    closes_at   time not null,
    source      text not null
        constraint spot_hours_source_check check (source in ('USER', 'OWNER', 'SEED')),
    updated_by  uuid references users on delete set null,
    updated_at  timestamptz not null default now(),
    constraint spot_hours_slot_key unique (spot_id, day_of_week, opens_at)
);

create index spot_hours_spot_idx on spot_hours (spot_id, day_of_week);
```

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

```powershell
.\mvnw.cmd "-Dtest=SpotHoursConstraintTest" test
```

Kết quả mong đợi: PASS cả sáu.

- [ ] **Step 5: Commit**

```bash
git add src/main/resources/db/migration/V3_7__spot_hours.sql src/test/java/com/vinhung/nookaapi/spot/SpotHoursConstraintTest.java
git commit -m "feat(spot): add user-contributed opening hours"
```

---

## Task 10: `posts.public_id`

**Files:**
- Create: `src/main/resources/db/migration/V3_8__post_public_id.sql`
- Create: `src/test/java/com/vinhung/nookaapi/post/PostPublicIdTest.java`
- Modify: `src/main/java/com/vinhung/nookaapi/post/entity/Post.java`

**Interfaces:**
- Consumes: `BaseEntity` sinh UUID v7 từ Task 2 — đây là lý do task này tồn tại.
- Produces: `Post.getPublicId()` trả `UUID`. Không có setter: giá trị do database sinh và không bao giờ đổi.

---

- [ ] **Step 1: Viết test thất bại**

Tạo `src/test/java/com/vinhung/nookaapi/post/PostPublicIdTest.java`:

```java
package com.vinhung.nookaapi.post;

import static org.assertj.core.api.Assertions.assertThat;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.post.entity.Post;
import com.vinhung.nookaapi.shared.model.Visibility;
import com.vinhung.nookaapi.spot.entity.Area;
import com.vinhung.nookaapi.spot.entity.City;
import com.vinhung.nookaapi.spot.entity.Place;
import com.vinhung.nookaapi.spot.entity.Spot;
import com.vinhung.nookaapi.user.entity.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * UUID v7 kể ra thời điểm tạo vì mốc thời gian nằm ngay trong id, mà
 * {@code posts.hide_time} tồn tại để giấu đúng thứ đó — và id nằm trong URL.
 *
 * <p>Nên bài viết có hai định danh: {@code id} v7 dùng nội bộ và trong khoá
 * ngoại, {@code public_id} ngẫu nhiên là thứ duy nhất xuất hiện trong API và
 * URL. Lợi thêm: không ai dò được số bài viết của hệ thống.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class PostPublicIdTest {

    @Autowired
    private EntityManager em;

    private User author;
    private Spot spot;

    @BeforeEach
    void setUp() {
        author = User.builder()
                .email("publicid-author@example.test")
                .passwordHash("unused")
                .username("publicidauthor")
                .displayName("public id author")
                .build();
        em.persist(author);

        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        Area area = Area.builder().city(city).name("District 1").build();
        em.persist(area);
        spot = Place.builder().name("Quan ca phe").area(area).createdById(author.getId()).build();
        em.persist(spot);
        em.flush();
    }

    @Test
    @DisplayName("Bài mới tự có public_id")
    void newPostGetsAPublicId() {
        Post post = persistPost();

        assertThat(em.find(Post.class, post.getId()).getPublicId()).isNotNull();
    }

    @Test
    @DisplayName("public_id khác id, và không phải v7 nên không kể ra thời điểm đăng")
    void publicIdDiffersFromInternalIdAndIsRandom() {
        Post post = persistPost();
        Post reloaded = em.find(Post.class, post.getId());

        assertThat(reloaded.getPublicId()).isNotEqualTo(reloaded.getId());
        assertThat(reloaded.getId().version()).isEqualTo(7);
        assertThat(reloaded.getPublicId().version()).isEqualTo(4);
    }

    @Test
    @DisplayName("Hai bài có public_id khác nhau")
    void publicIdsAreUniqueAcrossPosts() {
        Post first = persistPost();
        Post second = persistPost();

        assertThat(em.find(Post.class, first.getId()).getPublicId())
                .isNotEqualTo(em.find(Post.class, second.getId()).getPublicId());
    }

    private Post persistPost() {
        Post post = Post.builder()
                .authorId(author.getId())
                .spotId(spot.getId())
                .visibility(Visibility.PUBLIC)
                .caption("ca phe ngon")
                .build();
        em.persist(post);
        em.flush();
        em.clear();
        return post;
    }
}
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```powershell
.\mvnw.cmd "-Dtest=PostPublicIdTest" test
```

Kết quả mong đợi: FAIL lúc compile — không có `getPublicId()`.

- [ ] **Step 3: Viết migration**

Tạo `src/main/resources/db/migration/V3_8__post_public_id.sql`:

```sql
-- Mục 4.4 và 6.7 của spec.
--
-- BaseEntity đã đổi sang UUID v7 để bản ghi mới dồn về mép phải của B-tree
-- thay vì rơi ngẫu nhiên khắp index. Nhưng v7 nhét mốc thời gian vào 48 bit
-- đầu, tức là id KỂ RA thời điểm tạo — mà posts.hide_time tồn tại chính để
-- giấu thứ đó, và id thì nằm trong URL.
--
-- Giải bằng hai định danh: posts.id (v7) chỉ dùng nội bộ và trong khoá ngoại;
-- public_id (ngẫu nhiên) là thứ duy nhất xuất hiện trong API và URL.
--
-- gen_random_uuid() sinh v4 hoàn toàn ngẫu nhiên. Ở đây tính ngẫu nhiên là
-- mục đích chứ không phải khuyết điểm: nó không kể thời gian và không cho ai
-- dò ra số bài viết của hệ thống.
--
-- Dòng đã có nhận giá trị ngẫu nhiên nhờ default, nên not null an toàn.

alter table posts add column public_id uuid not null default gen_random_uuid();

create unique index posts_public_id_key on posts (public_id);
```

- [ ] **Step 4: Thêm field vào entity `Post`**

Sửa `src/main/java/com/vinhung/nookaapi/post/entity/Post.java`. Thêm import:

```java
import lombok.Setter;
```

(Đã có sẵn — kiểm lại rồi bỏ qua nếu trùng.)

Thêm field ngay sau khai báo class, trước `authorId`:

```java
    /**
     * Định danh công khai, thứ duy nhất được xuất hiện trong API và URL.
     *
     * <p>Tách khỏi {@code id} vì {@code id} là UUID v7 và kể ra thời điểm tạo,
     * trong khi {@code hideTime} tồn tại để giấu đúng thứ đó.
     *
     * <p>{@code insertable = false, updatable = false}: giá trị do database
     * sinh bằng {@code default gen_random_uuid()} và không bao giờ đổi. Không
     * có setter — sửa nó là làm hỏng mọi link đã phát ra ngoài.
     */
    @Setter(lombok.AccessLevel.NONE)
    @Column(name = "public_id", nullable = false, insertable = false, updatable = false)
    private UUID publicId;
```

- [ ] **Step 5: Chạy test để chắc chắn nó xanh**

```powershell
.\mvnw.cmd "-Dtest=PostPublicIdTest" test
```

Kết quả mong đợi: PASS cả ba.

Nếu `newPostGetsAPublicId` trả về null: `persistPost` phải có `em.flush()` rồi `em.clear()` rồi `em.find()` lại — giá trị do database sinh nên bản trong bộ nhớ sau `persist` chưa có nó. Test đã viết đúng thứ tự này; nếu vẫn null thì kiểm `insertable = false` có bị bỏ sót không.

- [ ] **Step 6: Chạy `PostVisibilityRulesTest` để chắc chắn không phá luật đọc**

```powershell
.\mvnw.cmd "-Dtest=PostVisibilityRulesTest" test
```

Kết quả mong đợi: PASS toàn bộ 14 test.

- [ ] **Step 7: Commit**

```bash
git add src/main/resources/db/migration/V3_8__post_public_id.sql src/main/java/com/vinhung/nookaapi/post/entity/Post.java src/test/java/com/vinhung/nookaapi/post/PostPublicIdTest.java
git commit -m "feat(post): add random public id so hide_time is not defeated by v7 ids"
```

---

## Task 11: `post_media`, `reports`, `notifications`

Ba bảng này không có entity JPA từ `V1` và vẫn chưa cần. Thay đổi thuần SQL.

Phần quan trọng nhất là vá `reports`: `V1` đang để `reporter_id ... on delete cascade`, nghĩa là ai bị quấy rối, gửi báo cáo, rồi rời app vì quá mệt — **bằng chứng đi theo họ và kẻ kia sạch hồ sơ.**

**Files:**
- Create: `src/main/resources/db/migration/V3_9__media_reports_notifications.sql`
- Create: `src/test/java/com/vinhung/nookaapi/db/ReportsAndNotificationsTest.java`

**Interfaces:**
- Consumes: bảng `posts`, `users`, `reports`, `notifications`, `post_media` từ `V1`.
- Produces: không có API Java nào.

---

- [ ] **Step 1: Viết test thất bại**

Tạo `src/test/java/com/vinhung/nookaapi/db/ReportsAndNotificationsTest.java`:

```java
package com.vinhung.nookaapi.db;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vinhung.nookaapi.TestcontainersConfiguration;
import com.vinhung.nookaapi.user.entity.User;
import jakarta.persistence.EntityManager;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * V1 để reports.reporter_id ... on delete cascade. Hệ quả: người bị quấy rối
 * gửi báo cáo rồi rời app vì quá mệt, và bằng chứng đi theo họ trong khi kẻ kia
 * sạch hồ sơ. Đây là lỗ về an toàn, không phải chuyện gọn gàng dữ liệu.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class ReportsAndNotificationsTest {

    @Autowired
    private EntityManager em;

    @Test
    @DisplayName("Xoá tài khoản người báo cáo thì báo cáo vẫn còn")
    void reportSurvivesDeletionOfItsReporter() {
        User reporter = persistUser("reporter");
        User reported = persistUser("reported");

        em.createNativeQuery("""
                insert into reports (reporter_id, reported_user_id, reason)
                values (:reporter, :reported, 'harassment')
                """)
                .setParameter("reporter", reporter.getId())
                .setParameter("reported", reported.getId())
                .executeUpdate();

        em.createNativeQuery("delete from users where id = :id")
                .setParameter("id", reporter.getId())
                .executeUpdate();
        em.flush();
        em.clear();

        Object count = em.createNativeQuery(
                        "select count(*) from reports where reported_user_id = :id")
                .setParameter("id", reported.getId())
                .getSingleResult();

        assertThat(((Number) count).intValue()).isEqualTo(1);
    }

    @Test
    @DisplayName("Báo cáo của tài khoản đã xoá không còn trỏ vào ai")
    void orphanedReportHasNullReporter() {
        User reporter = persistUser("orphan-reporter");
        User reported = persistUser("orphan-reported");

        em.createNativeQuery("""
                insert into reports (reporter_id, reported_user_id, reason)
                values (:reporter, :reported, 'spam')
                """)
                .setParameter("reporter", reporter.getId())
                .setParameter("reported", reported.getId())
                .executeUpdate();

        em.createNativeQuery("delete from users where id = :id")
                .setParameter("id", reporter.getId())
                .executeUpdate();
        em.flush();

        Object count = em.createNativeQuery("""
                select count(*) from reports
                where reported_user_id = :id and reporter_id is null
                """)
                .setParameter("id", reported.getId())
                .getSingleResult();

        assertThat(((Number) count).intValue()).isEqualTo(1);
    }

    @Test
    @DisplayName("Thông báo chưa đọc cùng group_key không thể có hai dòng")
    void unreadNotificationsWithSameGroupKeyAreCollapsed() {
        User recipient = persistUser("notified");
        insertNotification(recipient.getId(), "REACTION", "post:abc");

        assertThatThrownBy(() -> insertNotification(recipient.getId(), "REACTION", "post:abc"))
                .hasMessageContaining("notifications_group_idx");
    }

    @Test
    @DisplayName("Thông báo không có group_key thì không bị gộp")
    void notificationsWithoutGroupKeyAreNotCollapsed() {
        User recipient = persistUser("ungrouped");
        insertNotification(recipient.getId(), "FOLLOW", null);
        insertNotification(recipient.getId(), "FOLLOW", null);

        Object count = em.createNativeQuery(
                        "select count(*) from notifications where recipient_id = :id")
                .setParameter("id", recipient.getId())
                .getSingleResult();

        assertThat(((Number) count).intValue()).isEqualTo(2);
    }

    @Test
    @DisplayName("Payload jsonb ghi và đọc lại được")
    void notificationPayloadRoundTrips() {
        User recipient = persistUser("payload");
        em.createNativeQuery("""
                insert into notifications (recipient_id, type, payload)
                values (:id, 'CLAIM_APPROVED', cast(:payload as jsonb))
                """)
                .setParameter("id", recipient.getId())
                .setParameter("payload", "{\"claimId\":\"c-1\",\"spotName\":\"Workshop\"}")
                .executeUpdate();
        em.flush();

        Object spotName = em.createNativeQuery("""
                select payload ->> 'spotName' from notifications where recipient_id = :id
                """)
                .setParameter("id", recipient.getId())
                .getSingleResult();

        assertThat(spotName).isEqualTo("Workshop");
    }

    @Test
    @DisplayName("Ảnh mới mặc định READY")
    void newMediaDefaultsToReady() {
        UUID postId = persistPostReturningId();
        em.createNativeQuery("""
                insert into post_media (post_id, url) values (:postId, 'https://cdn.example/a.jpg')
                """)
                .setParameter("postId", postId)
                .executeUpdate();
        em.flush();

        Object status = em.createNativeQuery(
                        "select status from post_media where post_id = :postId")
                .setParameter("postId", postId)
                .getSingleResult();

        assertThat(status).isEqualTo("READY");
    }

    @Test
    @DisplayName("Trạng thái ảnh ngoài bốn giá trị cho phép bị từ chối")
    void unknownMediaStatusIsRejected() {
        UUID postId = persistPostReturningId();

        assertThatThrownBy(() -> {
            em.createNativeQuery("""
                    insert into post_media (post_id, url, status)
                    values (:postId, 'https://cdn.example/b.jpg', 'BOGUS')
                    """)
                    .setParameter("postId", postId)
                    .executeUpdate();
            em.flush();
        }).hasMessageContaining("post_media_status_check");
    }

    /**
     * post_media.post_id là khoá ngoại not null, nên test trạng thái ảnh cần
     * một bài viết thật. Dựng bằng SQL thô để test này không phụ thuộc entity
     * của module post.
     */
    private UUID persistPostReturningId() {
        User author = persistUser("media-author-" + UUID.randomUUID());
        City city = City.builder().name("Ho Chi Minh City").countryCode("VN").build();
        em.persist(city);
        Area area = Area.builder().city(city).name("District 1").build();
        em.persist(area);
        Place place = Place.builder()
                .name("Quan ca phe")
                .area(area)
                .createdById(author.getId())
                .build();
        em.persist(place);
        em.flush();

        UUID postId = UUID.randomUUID();
        em.createNativeQuery("""
                insert into posts (id, author_id, spot_id, visibility)
                values (:id, :author, :spot, 'PUBLIC')
                """)
                .setParameter("id", postId)
                .setParameter("author", author.getId())
                .setParameter("spot", place.getId())
                .executeUpdate();
        em.flush();
        return postId;
    }

    private void insertNotification(UUID recipientId, String type, String groupKey) {
        em.createNativeQuery("""
                insert into notifications (recipient_id, type, group_key)
                values (:id, :type, :groupKey)
                """)
                .setParameter("id", recipientId)
                .setParameter("type", type)
                .setParameter("groupKey", groupKey)
                .executeUpdate();
        em.flush();
    }

    private User persistUser(String username) {
        User user = User.builder()
                .email(username + "@example.test")
                .passwordHash("unused")
                .username(username)
                .displayName(username)
                .build();
        em.persist(user);
        em.flush();
        return user;
    }
}
```

Import cần có ở đầu file, ngoài những import đã liệt kê trong khối trên:

```java
import com.vinhung.nookaapi.spot.entity.Area;
import com.vinhung.nookaapi.spot.entity.City;
import com.vinhung.nookaapi.spot.entity.Place;
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```powershell
.\mvnw.cmd "-Dtest=ReportsAndNotificationsTest" test
```

Kết quả mong đợi: cả bảy test FAIL, vì bốn lý do khác nhau:

| Test | Đỏ vì |
|---|---|
| `reportSurvivesDeletionOfItsReporter`, `orphanedReportHasNullReporter` | `on delete cascade` xoá báo cáo theo tài khoản |
| `unreadNotificationsWithSameGroupKeyAreCollapsed`, `notificationPayloadRoundTrips` | chưa có cột `group_key` và `payload` |
| `notificationsWithoutGroupKeyAreNotCollapsed` | chưa có cột `group_key` |
| `newMediaDefaultsToReady`, `unknownMediaStatusIsRejected` | chưa có cột `status` trên `post_media` |

- [ ] **Step 3: Viết migration**

Tạo `src/main/resources/db/migration/V3_9__media_reports_notifications.sql`:

```sql
-- Mục 6.6, 6.8 và 6.9 của spec.


-- ---------------------------------------------------------------------------
-- post_media: đặt sẵn cột cho luồng ảnh (mục 12.1)
--
-- R1 khoá: strip EXIF ở server, client không bao giờ được coi là đã sạch. Luật
-- đó loại kiến trúc phổ biến "client xin presigned URL rồi tải thẳng lên S3",
-- vì ảnh còn nguyên EXIF đã nằm trong kho trước khi server kịp chạm vào.
--
-- Bản đầu dùng cách qua server và LUÔN ghi 'READY'. Cột status vẫn có mặt từ
-- bây giờ để ngày chuyển sang xử lý bất đồng bộ chỉ phải đổi luồng, không phải
-- migrate một bảng ảnh đã có hàng triệu dòng.
--
-- storage_key tách khỏi url vì đổi CDN hay đổi nhà cung cấp kho thì url đổi
-- hết còn storage_key không đổi.
-- ---------------------------------------------------------------------------

alter table post_media
    add column status       text not null default 'READY'
        constraint post_media_status_check
        check (status in ('PENDING', 'PROCESSING', 'READY', 'FAILED')),
    add column storage_key  text,
    add column content_type text,
    add column bytes        bigint,
    add column checksum     text;


-- ---------------------------------------------------------------------------
-- reports: vá một lỗ về an toàn có trong V1
--
-- V1 để reporter_id ... on delete cascade. Hệ quả: người bị quấy rối gửi báo
-- cáo rồi rời app vì quá mệt, và bằng chứng đi theo họ trong khi kẻ kia sạch
-- hồ sơ. Báo cáo phải sống lâu hơn tài khoản đã gửi nó.
-- ---------------------------------------------------------------------------

alter table reports drop constraint reports_reporter_id_fkey;
alter table reports alter column reporter_id drop not null;
alter table reports add constraint reports_reporter_id_fkey
    foreign key (reporter_id) references users on delete set null;


-- ---------------------------------------------------------------------------
-- notifications: tránh bẫy thêm một cột cho mỗi loại thông báo
--
-- Loại mới sẽ cần tham chiếu mới: lời mời chat cần conversation_id, duyệt claim
-- cần claim_id, nhắc review cần review_id. Thêm một cột cho mỗi loại dẫn tới
-- một bảng 20 cột mà mỗi dòng chỉ dùng hai.
--
-- Giữ actor_id/post_id/spot_id làm cột thật vì chúng cần index và cần
-- on delete cascade. Phần đặc thù từng loại vào payload.
--
-- group_key cộng partial unique index chặn 40 dòng thông báo cho một bài:
-- "3 người đã thích bài của bạn" thay vì ba dòng. Chỉ ép trên dòng chưa đọc —
-- đã đọc rồi thì một nhóm mới được phép bắt đầu.
-- ---------------------------------------------------------------------------

alter table notifications
    add column payload    jsonb       not null default '{}',
    add column group_key  text,
    add column updated_at timestamptz not null default now();

create unique index notifications_group_idx on notifications (recipient_id, group_key)
    where group_key is not null and read_at is null;
```

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

```powershell
.\mvnw.cmd "-Dtest=ReportsAndNotificationsTest" test
```

Kết quả mong đợi: PASS cả bảy.

Nếu bước `drop constraint reports_reporter_id_fkey` báo `constraint does not exist`, tra tên thật:

```sql
select conname from pg_constraint
where conrelid = 'reports'::regclass and contype = 'f';
```

Rồi sửa migration dùng đúng tên đó. PostgreSQL đặt tên khoá ngoại theo mẫu `<table>_<column>_fkey` nên tên trên gần như chắc chắn đúng, nhưng kiểm vẫn rẻ hơn đoán.

- [ ] **Step 5: Commit**

```bash
git add src/main/resources/db/migration/V3_9__media_reports_notifications.sql src/test/java/com/vinhung/nookaapi/db/ReportsAndNotificationsTest.java
git commit -m "feat(db): media processing state, durable reports, grouped notifications"
```

---

## Task 12: Chạy đủ và cập nhật tài liệu

`nooka-mobile/AGENTS.md` nói đúng: *"Luật sai còn tệ hơn không có luật — nó dạy người đọc rằng file này không đáng tin."*

**Files:**
- Modify: `nooka-api/AGENTS.md`
- Modify: `nooka-api/MEMORY.md`

**Interfaces:**
- Consumes: mọi thứ từ Task 1–11.
- Produces: không có code.

---

- [ ] **Step 1: Chạy toàn bộ test**

```powershell
.\mvnw.cmd test
```

Kết quả mong đợi: PASS toàn bộ. Không đi tiếp nếu còn một test đỏ.

- [ ] **Step 2: Chạy riêng nhóm guard không cần Docker**

```powershell
.\mvnw.cmd "-Dtest=ModularityTest,ArchitectureTest,ApiExceptionHandlerTest,SecurityConfigTest,BearerTokenAuthenticationFilterTest,OpenApiEndpointTest" test
```

Kết quả mong đợi: PASS. Nhóm này là lưới an toàn kiến trúc; nó phải xanh độc lập với Docker.

- [ ] **Step 3: Thêm R9 vào phần luật truy cập Post của `AGENTS.md`**

Trong `nooka-api/AGENTS.md`, phần **"Luật truy cập Post"**, thêm dòng này vào cuối danh sách gạch đầu dòng, ngay trước đoạn *"Mọi thay đổi luật visibility phải viết hoặc cập nhật test trước"*:

```markdown
- Bài của tài khoản có `users.deleted_at` khác null không hiển thị với bất kỳ ai, kể cả chính tác giả. Phép kiểm đi qua `user.query.RelationshipCriteria.deletedAuthorExists` và phải có mặt ở **cả hai** nhánh của `visibleTo` — quên nhánh khách chưa đăng nhập là lỗ rò lớn nhất vì đó là nhánh ai cũng chạm được.
```

- [ ] **Step 4: Thêm quyết định UUIDv7 vào `AGENTS.md`**

Trong `nooka-api/AGENTS.md`, phần **"Ranh giới transaction và JPA"**, thay dòng *"Giữ UUID làm định danh chính trừ khi product spec thay đổi"* bằng:

```markdown
- Giữ UUID làm định danh chính trừ khi product spec thay đổi. `BaseEntity` sinh **UUID v7** qua `@UuidGenerator(style = VERSION_7)`. Không dùng `Style.TIME`: nó là UUID v1 và nhúng địa chỉ IP/MAC của máy chủ vào id.
- `Post` có hai định danh: `id` (v7, nội bộ và khoá ngoại) và `public_id` (ngẫu nhiên, thứ duy nhất xuất hiện trong API và URL). Lý do: v7 kể ra thời điểm tạo, mà `hide_time` tồn tại để giấu đúng thứ đó.
```

- [ ] **Step 5: Thêm yêu cầu PostGIS vào `AGENTS.md`**

Trong `nooka-api/AGENTS.md`, phần **"Nền tảng kỹ thuật"**, thay dòng *"PostgreSQL 17 cho local và integration test"* bằng:

```markdown
- PostgreSQL 17 **có PostGIS** cho local và integration test. Image là `postgis/postgis:17-3.5-alpine`, không phải `postgres:17-alpine` — schema cần extension `postgis` và `pg_trgm` từ `V3_1`.
```

- [ ] **Step 6: Cập nhật `MEMORY.md`**

Trong `nooka-api/MEMORY.md`, phần **"Database"**, thay danh sách migration bằng:

```markdown
- `V1__baseline.sql`: schema gốc của vertical slice.
- `V2__modulith_event_publication.sql`: registry Flyway-owned cho Spring Modulith.
- `V3_1` … `V3_9`: giai đoạn 1 (foundation) của thiết kế database. Flyway chuẩn hoá `_` thành `.` nên chúng là version 3.1–3.9, sắp giữa V3 và V4.
- Giai đoạn 2–5 (tag/review, discovery, business, messaging) **đã thiết kế, chưa triển khai**. Xem `../docs/superpowers/specs/2026-08-08-nooka-database-design.md`.

Quyết định bền vững của giai đoạn 1:

- PostgreSQL phải có PostGIS (`postgis/postgis:17-3.5-alpine`); extension `postgis` và `pg_trgm` bật ở `V3_1`.
- `BaseEntity` sinh UUID v7. `posts.public_id` là định danh công khai riêng.
- R9: bài của tài khoản đã xoá mềm biến mất với mọi người, ép trong `PostVisibilityRules`.
- `spots.source` chỉ có `USER_CREATED` và `SEEDED`. Không có giá trị nào cho Google — §7 và ToS của Google Maps Platform.
- Không có cột counter nào cho số liệu tổng hợp; đếm lúc đọc qua module `insight` (chưa triển khai).
```

- [ ] **Step 7: Commit**

```bash
git add AGENTS.md MEMORY.md
git commit -m "docs: record phase 1 database decisions and R9 visibility rule"
```

---

## Self-Review

**Spec coverage — mục 6 của spec so với plan:**

| Mục spec | Task |
|---|---|
| 6.1 Extension | Task 1 |
| 6.2 `users` | Task 4 |
| 6.3 `cities.timezone` | Task 3 |
| 6.4 `spots.source`, `places.geog`, index, `spot_merge_candidates` | Task 6, 7, 8 |
| 6.5 `spot_hours` | Task 9 |
| 6.6 `post_media` | Task 11 |
| 6.7 `posts.public_id` | Task 10 |
| 6.8 `reports` | Task 11 |
| 6.9 `notifications` | Task 11 |
| 4.2 PostGIS, đổi image | Task 1 |
| 4.4 UUID v7 | Task 2 |
| 12.2 R9 | Task 5 |
| 15 Tài liệu | Task 12 |

Không có mục nào của giai đoạn 1 thiếu task.

**Nằm ngoài plan này, đúng theo spec:** module `insight` (mục 5.3) không có bảng nào và interface của nó chỉ có nghĩa khi có consumer — thuộc giai đoạn 2. Truy vấn feed và xếp hạng (mục 11.1, 11.2) cũng vậy.

**Type consistency đã kiểm:**
- `SpotSource.USER_CREATED` / `SEEDED` — dùng thống nhất ở Task 6 (enum, entity, migration, test).
- `SpotDuplicateFinder.findNear(String, BigDecimal, BigDecimal, double, double)` — chữ ký giống hệt ở interface, implementation và cả bảy test của Task 7.
- `DuplicateSpotCandidate.spotId()` / `.distanceMeters()` — tên accessor của record khớp giữa định nghĩa và test.
- `RelationshipCriteria.deletedAuthorExists(CriteriaQuery<?>, CriteriaBuilder, Path<UUID>)` — ba tham số, không có `viewerId`, giống nhau ở interface, implementation và nơi gọi trong `PostVisibilityRules`.
- `User.setDeletedAt(Instant)` do Task 4 tạo, Task 5 dùng.
- `Post.getPublicId()` không có setter ở cả entity lẫn test.
- Tên constraint đặt tường minh trong migration (`spots_source_check`, `users_bio_length`, `spot_merge_candidates_order_check`, `spot_hours_day_check`, `post_media_status_check`) khớp với chuỗi mà test tìm trong thông báo lỗi.

**Thứ tự task có phụ thuộc thật:**
Task 1 chặn Task 7 (cần PostGIS và pg_trgm). Task 2 chặn Task 10 (`public_id` chỉ có nghĩa khi `id` là v7). Task 4 chặn Task 5 (R9 cần cột `deleted_at`). Task 3 liên quan Task 9 nhưng không chặn. Các task còn lại độc lập.
