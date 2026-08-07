# AGENTS.md

## Phạm vi

File này áp dụng cho toàn bộ repository `nooka-api`.

- Làm việc trong đúng repository backend; không tự ý sửa `../nooka-mobile` hoặc `../nooka-docs`.
- Tôn trọng thay đổi chưa commit. Trước khi sửa, luôn chạy `git status --short` và không xoá, ghi đè hay hoàn tác code của người dùng.
- Không tạo commit, branch hoặc worktree nếu người dùng chưa yêu cầu.
- Ưu tiên thay đổi nhỏ, giải quyết nguyên nhân gốc và giữ nguyên kiến trúc hiện có.

## Context7 là bắt buộc

Khi công việc liên quan đến framework, thư viện, SDK, API, Maven plugin hoặc công cụ cloud, phải đọc tài liệu hiện hành bằng Context7 trước khi viết code hoặc cấu hình.

Quy trình:

1. Gọi `resolve-library-id` bằng tên chính thức và toàn bộ câu hỏi kỹ thuật.
2. Chọn tài liệu chính chủ, ưu tiên đúng phiên bản đang dùng.
3. Gọi `query-docs` với câu hỏi cụ thể; không truy vấn một từ chung chung.
4. Đối chiếu tài liệu với `pom.xml`, source và test hiện tại trước khi thay đổi.
5. Không nâng phiên bản chỉ vì tài liệu có bản mới hơn; nâng cấp dependency phải là một thay đổi có chủ đích.

Baseline cần ưu tiên khi resolve:

- Spring Boot `4.1.0`: `/spring-projects/spring-boot/v4.1.0` nếu ID này vẫn tồn tại.
- Flyway: tài liệu chính chủ `/flyway/flyway`; luôn kiểm tra version thực tế do Spring Boot quản lý.
- Testcontainers `1.21.3`: resolve lại theo version hiện tại; nếu Context7 chỉ có `1.21.2`, dùng tài liệu đó cho API không đổi và xác minh khác biệt trước khi áp dụng.

Không cần Context7 cho refactor thuần nội bộ, business logic riêng của Nooka, code review hoặc đọc hiểu source hiện có.

## Nguồn sự thật

Ưu tiên theo thứ tự:

1. Yêu cầu trực tiếp của người dùng.
2. Product spec: `../nooka-docs/product/specs/2026-07-27-nooka-design.md`.
3. Flyway migrations trong `src/main/resources/db/migration`.
4. Source và test hiện tại.
5. `README.md` và `MEMORY.md`.

Nếu tài liệu mâu thuẫn với migration hoặc code đã được test, không âm thầm chọn một bên. Nêu rõ mâu thuẫn và sửa tài liệu cùng thay đổi nếu phạm vi cho phép.

## Nền tảng kỹ thuật

- Java 21.
- Spring Boot 4.1.0, Spring Web MVC, Spring Data JPA, Bean Validation và Actuator.
- PostgreSQL 17 cho local và integration test.
- Flyway sở hữu schema.
- Maven Wrapper là cách chạy Maven chuẩn.
- Testcontainers 1.21.3 + JUnit Jupiter cho test cần database.
- Lombok chỉ dùng có chủ đích; không dùng `@Data` trên JPA entity.

Không thay PostgreSQL bằng H2. SQL và hành vi dialect của dự án phải được kiểm tra trên PostgreSQL thật.

## Lệnh chuẩn

PowerShell/Windows:

```powershell
.\run.ps1 -Check
.\run.ps1
.\mvnw.cmd test
docker compose --env-file .env -f infra/compose.yaml up -d
```

Unix-like:

```bash
./mvnw test
./mvnw spring-boot:run
docker compose --env-file .env -f infra/compose.yaml up -d
```

Kiểm tra health khi app đang chạy:

```bash
curl http://localhost:8080/actuator/health
```

Bắt đầu bằng test nhỏ nhất liên quan trực tiếp tới thay đổi, sau đó chạy toàn bộ `test` trước khi tuyên bố hoàn tất. Test tích hợp cần Docker đang chạy.

## Kiến trúc code

Tổ chức theo feature/package, không chia toàn bộ dự án thành các thư mục kỹ thuật toàn cục.

- `shared`: primitive dùng chung thật sự, hiện có `BaseEntity`, visibility value và HTTP error contract.
- `user`: user và social graph.
- `spot`: City, Area, Spot, Place và Experience.
- `post`: Post, visibility policy và cổng truy cập Post.

Khi thêm capability mới, đặt controller, DTO, service, repository và test cạnh feature sở hữu nghiệp vụ đó. Chỉ đưa code vào `common` khi có ít nhất hai feature thực sự dùng chung và semantics giống nhau.

Business rule phải nằm ở domain/service hoặc query policy có tên rõ ràng; controller chỉ parse request, gọi use case và map response.

## Ranh giới transaction và JPA

- Đặt transaction ở service/use-case hoặc gateway nghiệp vụ, không mở transaction trong controller.
- Query chỉ đọc dùng `@Transactional(readOnly = true)` khi phù hợp.
- `spring.jpa.open-in-view=false` là quyết định có chủ đích. Không dựa vào lazy loading ở controller hoặc serializer.
- Association mặc định ưu tiên `LAZY`; fetch đúng dữ liệu trong transaction bằng query rõ ràng, projection hoặc entity graph khi cần.
- Không trả JPA entity trực tiếp từ API. Dùng request/response DTO để tránh lazy-loading, recursion và rò rỉ field nội bộ.
- Không thêm `@Data`, `@EqualsAndHashCode` hoặc equals/hashCode sinh tự động cho entity kế thừa `BaseEntity`.
- Entity có khoá kép dạng value object có thể dùng equality theo toàn bộ key.
- Giữ UUID làm định danh chính trừ khi product spec thay đổi.
- Kiểm tra N+1 cho mọi endpoint trả collection.

## Luật truy cập Post

Đây là invariant bảo mật quan trọng nhất của backend:

- `post.repository.PostRepository` phải tiếp tục package-private.
- Mọi đường đọc `Post` phải đi qua `post.api.PostAccess`; implementation nằm package-private trong `post.repository`.
- Mỗi query Post phải bắt đầu bằng `PostVisibilityRules.visibleTo(viewerId)` rồi mới ghép điều kiện bổ sung.
- Không tạo repository/query/controller khác có thể đọc Post mà bỏ qua visibility policy.
- Bài soft-deleted không hiển thị với bất kỳ ai, kể cả tác giả.
- Guest chỉ thấy `PUBLIC`.
- Tác giả thấy bài của chính mình ở mọi visibility nếu chưa bị soft-delete.
- `FOLLOWERS` kiểm tra chiều viewer follow author.
- `CLOSE_FRIENDS` kiểm tra viewer nằm trong danh sách do author sở hữu; nó không phải tập con của followers.
- `PRIVATE` chỉ tác giả thấy.
- Block chặn khả năng xem theo cả hai chiều.
- Không phân biệt “không tồn tại” và “không có quyền xem” trong response công khai nếu việc phân biệt làm lộ nội dung.

Mọi thay đổi luật visibility phải viết hoặc cập nhật test trước, bao gồm chiều quan hệ và trường hợp âm.

## Database và Flyway

- Flyway sở hữu schema; Hibernate giữ `ddl-auto: validate`.
- Migration nằm tại `src/main/resources/db/migration` và theo mẫu `V<version>__<description>.sql`.
- Không sửa, đổi tên hoặc xoá migration đã có khả năng chạy trên database dùng chung.
- Thay đổi schema luôn tạo migration version mới. Sửa sai bằng forward migration, không chỉnh lịch sử.
- Entity mapping và migration phải thay đổi cùng nhau; test context phải chứng minh Hibernate validate thành công.
- Không dùng `flyway repair` để che checksum mismatch nếu chưa hiểu và ghi nhận lý do.
- Dùng constraint/index ở database cho invariant dữ liệu quan trọng; validation Java không thay thế constraint.
- SQL phải tương thích PostgreSQL 17 và giữ timestamp có timezone khi dữ liệu biểu diễn thời điểm tuyệt đối.

## API và validation

Khi thêm endpoint:

- Dùng request/response DTO; không expose entity.
- Dùng Bean Validation trên input và `@Valid` tại boundary.
- Trả status code đúng semantics; không trả `200` cho mọi kết quả.
- Pagination phải dùng cấu trúc ổn định và có giới hạn kích thước trang.
- Không log token, password, signed URL, PII nhạy cảm hoặc nội dung Private.
- Giữ error response nhất quán; nếu chưa có chuẩn chung, đề xuất trước khi tạo nhiều format khác nhau.
- API contract thay đổi phải cập nhật tài liệu trong `../nooka-docs` khi người dùng cho phép sửa repo đó.

## Security và privacy

- Firebase Auth phát hành token; backend chỉ verify JWT. Không thêm cột password hoặc tự xây hệ thống mật khẩu.
- Spring Security + Firebase Admin token verification được cấu hình tập trung trong `platform.security`; mặc định fail-closed và chỉ tắt bằng cấu hình local/test tường minh.
- Không tin `userId` do client gửi để xác định principal; ánh xạ từ token đã verify.
- R1 của product spec là bắt buộc: media upload phải strip EXIF ở server trước khi lưu/phân phối. Không tin client đã xoá metadata.
- Không thêm real-time location tracking.
- Nội dung Private không được đưa vào public feed, analytics công khai hoặc AI context công khai.
- Secret chỉ đến từ environment/secret manager; không commit credential hoặc token.

## Testing

- Business rule thuần: ưu tiên unit test nhanh.
- Repository, migration, Criteria Specification và transaction behavior: dùng integration test với PostgreSQL Testcontainers.
- Tận dụng `@ServiceConnection` trong `TestcontainersConfiguration`; không hard-code mapped port.
- Test visibility phải có cả case cho phép và từ chối, đặc biệt follow direction, close-friend ownership, block hai chiều và soft-delete.
- Test mới phải độc lập, không dựa vào thứ tự chạy và không dùng dữ liệu tồn tại từ test khác.
- Khi sửa migration hoặc entity, tối thiểu chạy test context và test repository liên quan.
- Không bỏ qua test vì Docker chưa chạy; báo rõ prerequisite hoặc lỗi môi trường.

## Kỷ luật thay đổi

- Đọc code lân cận và `git diff` trước khi chỉnh sửa.
- Không refactor ngoài phạm vi chỉ để “dọn code”.
- Không sửa generated output trong `target/`.
- Không thêm dependency nếu JDK hoặc Spring Boot đã cung cấp giải pháp đủ dùng.
- Khi thêm dependency, dùng Context7 và kiểm tra compatibility với Spring Boot 4.1.0 trước.
- Cập nhật `README.md` nếu thay đổi setup, command hoặc environment variable.
- Cập nhật `MEMORY.md` khi có quyết định bền vững, capability hoàn tất, dependency/version thay đổi hoặc blocker mới.

## Quy tắc cho MEMORY.md

`MEMORY.md` là snapshot kỹ thuật lâu dài, không phải nhật ký từng phiên làm việc.

- Chỉ lưu thông tin có ích cho phiên sau.
- Không lưu secret, token, dữ liệu người dùng hoặc suy đoán chưa xác nhận.
- Phân biệt rõ “đã triển khai”, “đã quyết định” và “chưa triển khai”.
- Xoá hoặc sửa thông tin cũ khi trạng thái thay đổi; không chỉ nối thêm ghi chú mâu thuẫn.
## Kiến trúc feature bắt buộc

Feature mới trong backend phải tách folder theo trách nhiệm, đặt dưới package của feature:

```text
<feature>/
├── controller/        # REST endpoints
├── service/            # business logic và use case
├── repository/        # Spring Data JPA repositories, chỉ khi feature có persistence
├── model/
│   ├── entity/        # JPA entities, chỉ khi feature có persistence
│   ├── dto/           # request/response DTOs
│   └── enums/         # feature enums xuất hiện trong contract
├── mapper/            # entity <-> DTO mappers, chỉ khi mapping đủ phức tạp
├── integration/       # external provider clients
├── cache/             # cache ports/adapters, only when the feature caches external results
└── config/            # feature-specific configuration
```

Không tạo folder rỗng hoặc dependency chỉ để khớp cây thư mục. Feature không có database không cần `repository/`, `model/entity/` hay `mapper/`. Controller chỉ parse/validate request và gọi service; service giữ use case; integration giữ HTTP/provider code; cache giữ port và adapter (Redis/Caffeine), không để business service phụ thuộc provider cache cụ thể; API chỉ expose DTO, không expose entity; secret chỉ đọc từ environment hoặc secret manager.
## Quyết định location mới — August 6, 2026

Mobile được phép dùng foreground GPS khi tab Search đang mở để cập nhật chấm xanh. Backend không nhận stream location, không lưu lịch sử di chuyển và không thực hiện background tracking. Endpoint route preview chỉ nhận một origin snapshot do user chủ động yêu cầu.
