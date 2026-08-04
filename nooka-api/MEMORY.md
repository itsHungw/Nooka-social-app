# MEMORY.md

> Snapshot kỹ thuật lâu dài cho repository `nooka-api`. Đây là context hỗ trợ agent, không thay thế product spec, migration, source hoặc test.

**Cập nhật gần nhất:** 2026-07-27

## Cách sử dụng

- Đọc file này sau `AGENTS.md` khi bắt đầu một task backend.
- Xác minh lại các chi tiết dễ thay đổi bằng source, `pom.xml`, `git status` và Context7.
- Cập nhật nội dung hiện có thay vì nối thêm ghi chú mâu thuẫn.
- Không lưu secret, credential, token, dữ liệu cá nhân hoặc nội dung Private.

## Repository

- `nooka-api` **không phải một repo riêng**. Nó là một thư mục trong repo `Nooka-social-app`, cùng chỗ với `nooka-mobile/` và `nooka-docs/`. Không có repo lồng, không có submodule.
- Remote: `https://github.com/itsHungw/Nooka-social-app`.
- Branch chính: `master`.
- Luật chung cho cả ba thư mục nằm ở `../AGENTS.md`.
- Product spec nằm tại `../nooka-docs/product/specs/2026-07-27-nooka-design.md`.
- Mobile client nằm tại `../nooka-mobile`.

Không ghim số commit vào file này. Nó sai sau đúng một commit, và một `MEMORY.md` sai còn tệ hơn không có — nó dạy người đọc rằng file này không đáng tin. Cần thì chạy `git log --oneline -1`.

### Trạng thái working tree

Toàn bộ vertical slice — `common/`, `post/`, `spot/`, `user/`, `V1__baseline.sql` và test — **đã được commit**. Vẫn luôn chạy `git status --short` trước khi sửa để không ghi đè việc đang dở của người khác.

## Stack hiện tại

- Java 21.
- Spring Boot 4.1.0.
- Maven Wrapper.
- Spring Web MVC, Spring Data JPA, Bean Validation và Actuator.
- PostgreSQL 17 Alpine cho local và integration test.
- Flyway + `flyway-database-postgresql`.
- Hibernate với `ddl-auto: validate` và Open EntityManager in View tắt.
- Testcontainers 1.21.3, JUnit Jupiter và Spring Boot `@ServiceConnection`.
- Lombok annotation processing được cấu hình cho main/test compile.

## Cấu hình runtime

Datasource đọc từ environment với default local:

| Biến | Default |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `nooka` |
| `DB_USER` | `nooka` |
| `DB_PASSWORD` | `nooka` |
| `PORT` | `8080` |

- Local PostgreSQL: `docker compose -f infra/compose.yaml up -d`.
- App: `.\mvnw.cmd spring-boot:run` trên Windows.
- Health: `GET /actuator/health`.
- Actuator chỉ expose `health` và `info` qua web.

## Kiến trúc đã có

### Common

- `BaseEntity` cung cấp UUID, `createdAt` và equality an toàn với Hibernate proxy.
- Equality chỉ dựa vào ID đã được gán; hash code ổn định theo effective entity class.
- Không dùng Lombok-generated equality trên entity kế thừa lớp này.

### User và social graph

- `User` lưu `firebaseUid`, username, display name, avatar và default post visibility.
- Không có password; Firebase Auth là identity provider đã chốt trong product spec.
- `Follow` là quan hệ một chiều với composite key `(followerId, followeeId)`.
- Mutual follow được suy ra từ hai hàng; không có bảng friendship riêng.
- `CloseFriend` là danh sách một chiều, riêng tư do owner quản lý.
- `Block` lưu một chiều nhưng business rule chặn tương tác/visibility theo cả hai chiều.

### Geography và Spot

- Cấu trúc hiện tại: `City -> Area -> Spot`.
- `Spot` là base entity dùng JPA `JOINED` inheritance.
- `Place` chứa address và tọa độ `BigDecimal`.
- `Experience` chứa giá, currency và thời gian bắt đầu/kết thúc.
- Place/Experience do user tạo; không dùng Google Places làm database gốc.
- Duplicate Spot được xử lý bằng `mergedInto` thay vì xoá bản cũ để giữ reference của Post.

### Post và privacy

- Mọi Post gắn với một `Spot` và một author.
- Visibility: `PUBLIC`, `FOLLOWERS`, `CLOSE_FRIENDS`, `PRIVATE`.
- Default của tài khoản mới là `FOLLOWERS`, không phải Public.
- `PostRepository` cố ý package-private.
- `PostAccess` là cổng đọc Post duy nhất và luôn áp dụng `PostVisibilityRules.visibleTo(viewerId)`.
- Guest chỉ thấy Public.
- Author thấy bài của mình trừ khi bài đã soft-delete.
- Followers chỉ thấy mức Followers khi viewer follow author đúng chiều.
- Close Friends dùng danh sách do author sở hữu; không phụ thuộc việc viewer follow author.
- Private chỉ author thấy.
- Block loại bài khỏi khả năng xem theo cả hai chiều.
- Soft-deleted Post không hiển thị với bất kỳ ai.
- Lookup Post bị cấm xem nên không làm lộ việc Post có tồn tại.

## Database

- Flyway sở hữu schema tại `src/main/resources/db/migration`.
- `V1__baseline.sql` đã tồn tại trong working tree, dù phần “Chưa có Migration” trong `README.md` hiện đã lỗi thời.
- Baseline dùng PostgreSQL-specific SQL và extension `pgcrypto`.
- Migrations đã áp dụng không được sửa; thay đổi schema tiếp theo phải là forward migration mới.
- Entity mapping và migration phải tiếp tục khớp để Hibernate `validate` thành công.

## Test hiện tại

- `NookaApiApplicationTests` kiểm tra Spring context với Testcontainers PostgreSQL.
- `TestcontainersConfiguration` khai báo `postgres:17-alpine` bằng `@ServiceConnection`.
- `PostVisibilityRulesTest` kiểm tra visibility trên PostgreSQL thật, gồm guest, author, follower, close friends, block hai chiều và soft-delete.
- Không dùng H2 vì migration và query dựa trên PostgreSQL semantics.
- Lệnh kiểm tra đầy đủ: `.\mvnw.cmd test`.

## Quyết định sản phẩm/kiến trúc đã khóa

- Nooka là social discovery dựa trên địa điểm; mọi Post phải gắn với địa điểm thật.
- Social graph là follow một chiều; mutual follow chỉ là trạng thái suy ra.
- Không tracking vị trí thời gian thực.
- Firebase Auth phát token, Spring backend verify JWT; không tự xây auth/password.
- Cloudflare R2 dự kiến lưu media; FCM dự kiến gửi push.
- Server phải strip EXIF khỏi media trước khi lưu hoặc phân phối.
- Post visibility phải được ép tại một điểm nghẽn duy nhất cho mọi query.
- Place là retention engine; Experience là revenue engine.
- AI chỉ tổ chức/lọc/tóm tắt dữ liệu có thật; không được bịa review, giá hoặc việc user đã đến.

## Chưa triển khai

- Chưa có controller/API endpoint hoàn chỉnh.
- Chưa có application service/use-case cho create/read workflow.
- Chưa có Spring Security hoặc Firebase JWT verification.
- Chưa có media upload, Cloudflare R2 integration hoặc server-side EXIF stripping.
- Chưa có capability `Want to go`, `Been`, `Ask` hoặc `Invite`.
- Chưa có comments/reactions/feed ranking/search/Ask Nooka.
- Chưa cấu hình OpenAPI. Trước khi thêm, phải dùng Context7 để kiểm tra tool tương thích Spring Boot 4.1.0 hiện tại.
- Chưa có API contract được xuất sang `nooka-docs`.

## Ghi chú vận hành

- Docker Engine 29 từ chối Docker API cũ hơn 1.44 trong môi trường đã gặp lỗi.
- `maven-surefire-plugin` hiện truyền JVM system property `api.version=1.44` cho test.
- Không chuyển property này sang `~/.testcontainers.properties`; docker-java cần JVM system property trong workaround hiện tại.
- Chỉ bỏ workaround sau khi xác minh phiên bản Testcontainers mới tự thương lượng thành công với Docker Engine 29 và toàn bộ test vẫn pass.

## Việc cần cập nhật khi trạng thái thay đổi

Cập nhật file này khi:

- commit vertical slice hiện tại hoặc đổi cấu trúc package;
- thêm endpoint/capability hoàn chỉnh;
- thay đổi dependency hoặc version nền tảng;
- thêm security, media, OpenAPI hoặc external service;
- thay đổi invariant visibility/privacy;
- thêm migration mới hoặc thay đổi chiến lược persistence;
- giải quyết/xuất hiện blocker vận hành lâu dài.
