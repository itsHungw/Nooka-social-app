# MEMORY.md

> Snapshot kỹ thuật lâu dài cho `nooka-api`. Product spec, migration và source hiện tại vẫn là nguồn sự thật cao hơn.

**Cập nhật gần nhất:** 2026-08-04

## Repository

- `nooka-api` là một thư mục trong repo phẳng `Nooka-social-app`, không phải submodule/repo lồng.
- Branch chính của remote là `master`; luôn kiểm tra branch và working tree trước khi sửa.
- Product spec: `../nooka-docs/product/specs/2026-07-27-nooka-design.md`.
- Architecture: `../nooka-docs/architecture/2026-07-28-nooka-api-architecture.md`.

## Stack

- Java 21, Spring Boot 4.1.0, Maven Wrapper.
- PostgreSQL 17, Spring Data JPA, Flyway; `ddl-auto=validate`, OSIV tắt.
- Spring Modulith 2.1.0 với JDBC event publication registry.
- ArchUnit 1.4.2 cho luật bên trong module.
- Spring Security + Firebase Admin SDK cho Firebase JWT boundary.
- springdoc-openapi 3.0.3, mặc định tắt bằng config.
- Testcontainers 1.21.3 với PostgreSQL thật.

## Kiến trúc đã triển khai

Các application module cấp một:

- `shared`: `BaseEntity`, shared model và global `ProblemDetail` handler. Module mở có chủ đích.
- `user`: entity social graph và named interface `query` cho relationship criteria.
- `spot`: City, Area, Spot, Place, Experience.
- `post`: Post, `PostAccess`, projection đọc, repository và visibility policy.
- `platform`: security/OpenAPI/Firebase adapter packages.

Quy tắc đang được test:

- `controller` không phụ thuộc `entity`/`repository`.
- Chỉ `post.repository` được chạm `PostRepository`.
- Modulith graph phải verify được.
- Không tạo cross-module JPA association: Post giữ `authorId`/`spotId`; Spot giữ `createdById`.
- `Visibility` nằm trong `shared.model` để tránh dependency cycle `user ↔ post`.
- Package đầy đủ dùng `package-info.java`, không dùng `.gitkeep`.

## Post privacy

- Mọi đường đọc Post đi qua `post.api.PostAccess`.
- `JpaPostAccess` và `PostRepository` package-private trong `post.repository`.
- `PostVisibilityRules` ghép `user.query.RelationshipCriteria` vào cùng SQL.
- Guest chỉ thấy Public; author thấy bài của mình; Followers/Close Friends đúng chiều; block hai chiều; soft-delete ẩn với mọi người.
- Không phân biệt bài không tồn tại và bài không được phép xem ở public API.

## Runtime

- Authentication mặc định bật: `AUTH_ENABLED=true`.
- Khi auth bật, `FIREBASE_PROJECT_ID` bắt buộc; thiếu config làm startup fail thay vì chạy insecure.
- Local compose đặt `AUTH_ENABLED=false` tường minh.
- OpenAPI mặc định tắt; local compose đặt `OPENAPI_ENABLED=true`.
- Compose tại `infra/compose.yaml` chạy cả PostgreSQL và API; `Dockerfile` build bằng Maven Wrapper trong multi-stage image.
- Local Compose dùng `.env` bị ignore và template `.env.example`; biến host-side có prefix `NOOKA_*` để tránh collision, chạy bằng `docker compose --env-file .env -f infra/compose.yaml ...`.
- `run.ps1` là entry point Windows local: đọc `.env`, map sang Spring process env, đợi PostgreSQL healthy và chạy Maven. Firebase host credentials dùng `NOOKA_FIREBASE_CREDENTIALS` → `GOOGLE_APPLICATION_CREDENTIALS`; không đọc hoặc log JSON.

## Database

- `V1__baseline.sql`: schema hiện có.
- `V2__modulith_event_publication.sql`: registry Flyway-owned cho Spring Modulith.
- Modulith JDBC schema initializer bị tắt tường minh; completion mode là `delete`.

## Verification

Guard không cần Docker:

```powershell
.\mvnw.cmd "-Dtest=ModularityTest,ArchitectureTest,ApiExceptionHandlerTest,SecurityConfigTest,BearerTokenAuthenticationFilterTest,FirebaseConfigTest,OpenApiEndpointTest" test
```

Full test cần Docker:

```powershell
.\mvnw.cmd test
```

Docker daemon phải chạy cho full suite Testcontainers; không được che prerequisite này bằng H2 hoặc skip test.

## Chưa triển khai

- Chưa có Account/Post/Feed/Spot business controller hoặc application service.
- Chưa có media upload, server-side EXIF stripping hoặc Cloudflare R2 adapter.
- Chưa có Want to go, Been, follow-up workflow, notification, report, comment, reaction, search hoặc Ask Nooka.
- Security mới dựng boundary JWT; mapping principal sang internal user UUID sẽ được làm cùng Account API để tránh abstraction không có caller.