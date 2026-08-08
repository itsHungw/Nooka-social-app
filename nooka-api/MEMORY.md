# MEMORY.md

> Snapshot kỹ thuật lâu dài cho `nooka-api`. Product spec, migration và source hiện tại vẫn là nguồn sự thật cao hơn.

**Cập nhật gần nhất:** 2026-08-08

## Repository

- `nooka-api` là một thư mục trong repo phẳng `Nooka-social-app`, không phải submodule/repo lồng.
- Branch chính của remote là `master`; luôn kiểm tra branch và working tree trước khi sửa.
- Product spec: `../nooka-docs/product/specs/2026-07-27-nooka-design.md`.
- Architecture: `../nooka-docs/architecture/2026-07-28-nooka-api-architecture.md`.

## Stack

- Java 21, Spring Boot 4.1.0, Maven Wrapper.
- PostgreSQL 17 + PostGIS 3.5 + pg_trgm, Spring Data JPA, Flyway; `ddl-auto=validate`, OSIV tắt.
- Spring Modulith 2.1.0 với JDBC event publication registry.
- ArchUnit 1.4.2 cho luật bên trong module.
- Spring Security + custom auth service cho bearer session boundary.
- springdoc-openapi 3.0.3, mặc định tắt bằng config.
- Testcontainers 1.21.3 với PostgreSQL thật, image `postgis/postgis:17-3.5-alpine`.
- Spring Data Redis dùng Redis Docker cho cache route preview; chưa thêm Caffeine.

## Kiến trúc đã triển khai

Các application module cấp một:

- `shared`: `BaseEntity`, shared model và global `ProblemDetail` handler. Module mở có chủ đích.
- `user`: entity social graph và named interface `query` cho relationship criteria.
- `spot`: City, Area, Spot, Place, Experience, giờ mở cửa, hàng đợi gộp, và `SpotDuplicateFinder` làm cổng chống trùng.
- `post`: Post, `PostAccess`, projection đọc, repository và visibility policy.
- `platform`: security/OpenAPI/auth integration packages.

Quy tắc đang được test:

- `controller` không phụ thuộc `entity`/`repository`.
- Chỉ `post.repository` được chạm `PostRepository`.
- Modulith graph phải verify được.
- Không tạo cross-module JPA association: Post giữ `authorId`/`spotId`; Spot giữ `createdById`.
- `Visibility` nằm trong `shared.model` để tránh dependency cycle `user ↔ post`.
- Package đầy đủ dùng `package-info.java`, không dùng `.gitkeep`.
- `directions.cache` giữ `RoutePreviewCache` port và Redis adapter; `RoutePreviewService` không phụ thuộc trực tiếp vào Redis để sau này thêm Caffeine decorator.

## Post privacy

- Mọi đường đọc Post đi qua `post.api.PostAccess`.
- `JpaPostAccess` và `PostRepository` package-private trong `post.repository`.
- `PostVisibilityRules` ghép `user.query.RelationshipCriteria` vào cùng SQL.
- Guest chỉ thấy Public; author thấy bài của mình; Followers/Close Friends đúng chiều; block hai chiều; soft-delete ẩn với mọi người.
- R9: tác giả có `users.deleted_at` thì bài của họ ẩn với mọi người. Áp ở **cả hai** nhánh của `visibleTo`, gồm nhánh khách chưa đăng nhập.
- Không phân biệt bài không tồn tại và bài không được phép xem ở public API.

## Runtime

- Authentication mặc định bật: `AUTH_ENABLED=true`.
- Auth email delivery dùng SMTP environment; không khởi động insecure khi production thiếu cấu hình cần thiết.
- Local compose đặt `AUTH_ENABLED=false` tường minh.
- OpenAPI mặc định tắt; local compose đặt `OPENAPI_ENABLED=true`.
- Compose tại `infra/compose.yaml` chạy cả PostgreSQL và API; `Dockerfile` build bằng Maven Wrapper trong multi-stage image.
- Local Compose dùng `.env` bị ignore và template `.env.example`; biến host-side có prefix `NOOKA_*` để tránh collision, chạy bằng `docker compose --env-file .env -f infra/compose.yaml ...`.
- `run.ps1` là entry point Windows local: đọc `.env`, map sang Spring process env, đợi PostgreSQL healthy và chạy Maven.

## Database

- `V1__baseline.sql`: schema gốc của vertical slice.
- `V2__modulith_event_publication.sql`: registry Flyway-owned cho Spring Modulith.
- `V3_1` … `V3_9`: giai đoạn 1 (foundation) của thiết kế database, **đã triển khai**. Flyway chuẩn hoá `_` thành `.` nên chúng là version 3.1–3.9 và sắp giữa V3 và V4.
- Modulith JDBC schema initializer bị tắt tường minh; completion mode là `delete`.

Giai đoạn 2–5 của thiết kế (tag/review, discovery, business, messaging) **đã thiết kế, chưa triển khai**. Xem `../docs/superpowers/specs/2026-08-08-nooka-database-design.md` và plan `../docs/superpowers/plans/2026-08-08-nooka-db-foundation.md`.

### Quyết định bền vững của giai đoạn 1

- PostgreSQL phải có PostGIS. Image `postgis/postgis:17-3.5-alpine` ở cả `infra/compose.yaml` lẫn `TestcontainersConfiguration`; extension `postgis` và `pg_trgm` bật ở `V3_1`.
- `BaseEntity` sinh UUID v7 qua `@UuidGenerator(style = VERSION_7)`. `Style.TIME` là UUID v1 và nhúng địa chỉ IP/MAC — không được dùng.
- `posts.public_id` là định danh công khai riêng, vì v7 kể ra thời điểm tạo còn `hide_time` tồn tại để giấu nó.
- **R9**: bài của tài khoản có `users.deleted_at` biến mất với mọi người; ép trong `PostVisibilityRules` ở cả hai nhánh, đi qua `RelationshipCriteria.deletedAuthorExists`.
- `spots.source` chỉ có `USER_CREATED` và `SEEDED`. Không có giá trị nào cho Google — §7 và ToS của Google Maps Platform.
- `spot.api.SpotDuplicateFinder` là cổng chống trùng place, cài đặt package-private trong `spot.repository` bằng native query PostGIS + pg_trgm. Cùng khuôn `PostAccess`.
- `reports.reporter_id` đổi từ `on delete cascade` sang `on delete set null`: báo cáo phải sống lâu hơn tài khoản đã gửi nó.
- Không có cột counter nào cho số liệu tổng hợp. Đếm lúc đọc qua module `insight` — **chưa triển khai**, thuộc giai đoạn 2.
- `spot_merge_candidates`, `spot_hours` và các cột mới trên `post_media`/`reports`/`notifications` **chưa có entity JPA**; entity đến cùng service ghi vào chúng.

## Verification

Guard không cần Docker:

```powershell
.\mvnw.cmd "-Dtest=ModularityTest,ArchitectureTest,ApiExceptionHandlerTest,SecurityConfigTest,BearerTokenAuthenticationFilterTest,OpenApiEndpointTest" test
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
- Security dùng opaque access token + rotating refresh session; principal là internal user UUID.