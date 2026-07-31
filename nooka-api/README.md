# nooka-api

Backend của Nooka. Spring Boot 4.1 trên Java 21, PostgreSQL, Flyway.

Spec sản phẩm nằm ở repo `nooka-docs`.

## Yêu cầu

- JDK 21
- Docker (chạy Postgres cho dev, và chạy test qua Testcontainers)

## Chạy local

Bật database:

```bash
docker compose -f infra/compose.yaml up -d
```

Chạy ứng dụng:

```bash
./mvnw spring-boot:run
```

Kiểm tra:

```bash
curl http://localhost:8080/actuator/health
```

## Chạy test

```bash
./mvnw test
```

Test tự khởi động một Postgres thật qua Testcontainers, nên **không cần** `compose up` trước. Chỉ cần Docker đang chạy.

Không dùng H2: Flyway migration được viết cho Postgres, và khác biệt dialect sẽ khiến test xanh trong khi production đỏ.

## Cấu hình

Datasource đọc từ biến môi trường, mặc định khớp với `infra/compose.yaml`:

| Biến | Mặc định |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `nooka` |
| `DB_USER` | `nooka` |
| `DB_PASSWORD` | `nooka` |
| `PORT` | `8080` |

## Quy ước

**Flyway sở hữu schema.** Hibernate đặt `ddl-auto: validate` nên không bao giờ tự sửa bảng. Mọi thay đổi schema là một file migration mới trong `src/main/resources/db/migration`, đặt tên `V<n>__<mô_tả>.sql`. Không sửa migration đã chạy.

**Open Session In View tắt.** Lazy loading không được phép xảy ra ở tầng controller, nơi không kiểm soát được số query.

## Ghi chú môi trường

**Docker Engine 29 yêu cầu API tối thiểu 1.44**, còn docker-java bên trong Testcontainers 1.21.3 mặc định gọi phiên bản thấp hơn và nhận HTTP 400 — báo ra ngoài thành thông báo gây hiểu lầm là "Could not find a valid Docker environment".

`pom.xml` ép `api.version=1.44` qua `maven-surefire-plugin`. Lưu ý: đặt giá trị này trong `~/.testcontainers.properties` **không có tác dụng** — docker-java chỉ đọc nó từ system property của JVM.

Bỏ cấu hình đó khi Testcontainers ra bản tự thương lượng phiên bản API với Docker 29+.

## Chưa có

- **Security.** Chưa thêm `spring-boot-starter-oauth2-resource-server`. Auth sẽ dùng Firebase Auth phát hành token, Spring verify JWT. Thêm khi có endpoint cần bảo vệ, cùng lớp phân quyền tập trung mô tả ở §20 của spec.
- **OpenAPI.** Chưa thêm springdoc. Không còn bị chặn về công cụ — `springdoc-openapi` 3.0.3 nhắm Spring Boot 4. Lưu ý bản đó build trên `spring-boot-starter-parent` 4.0.5 còn dự án chạy 4.1.0, nên khi thêm phải smoke test `/v3/api-docs` chứ đừng giả định là chạy.

## Kiến trúc

Quyết định kiến trúc nằm ở [`nooka-docs/architecture/2026-07-28-nooka-api-architecture.md`](../nooka-docs/architecture/2026-07-28-nooka-api-architecture.md): bản đồ module, quy ước package, ranh giới ép bằng Spring Modulith và ArchUnit, đường đọc/ghi Post, event xuyên module.

Code hiện tại **chưa theo cấu trúc đó** — nó được viết trước khi kiến trúc được chốt, và việc chuyển sang nằm trong implementation plan sắp tới.