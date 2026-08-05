# nooka-api

Backend của Nooka. Java 21, Spring Boot 4.1, PostgreSQL 17, Flyway, Spring Modulith và Spring Security.

## Yêu cầu

- JDK 21
- Docker Desktop/Engine
- Windows PowerShell 5.1+ để dùng `run.ps1`

## Cấu hình local

Tạo file local từ template rồi tự điền giá trị cần thiết. `.env` bị Git và Docker build context bỏ qua; chỉ `.env.example` được commit.

```powershell
Copy-Item .env.example .env
```

Các biến local dùng prefix `NOOKA_*` để không bị biến `DB_*`, `PORT` hoặc cấu hình dự án khác trên máy ghi đè. Không dùng các giá trị local này cho production.

## Chạy local bằng PowerShell

Kiểm tra `.env` mà không chạy Docker hay Maven:

```powershell
.\run.ps1 -Check
```

Chạy backend:

```powershell
.\run.ps1
```

Runner thực hiện theo thứ tự:

1. Đọc `.env` và validate cấu hình mà không in password/token.
2. Map `NOOKA_*` sang biến runtime của Spring Boot.
3. Khởi động PostgreSQL bằng Compose và đợi container healthy.
4. Chạy `mvnw.cmd spring-boot:run`.

Các lựa chọn khác:

```powershell
.\run.ps1 -SkipDatabase
.\run.ps1 -EnvFile .env.local
```

`-SkipDatabase` dùng khi PostgreSQL đã chạy. PostgreSQL mặc định tiếp tục chạy sau khi app dừng để giữ dữ liệu local.

## Firebase Auth local

### Không dùng auth

Giữ cấu hình sau khi chưa có Firebase credentials:

```dotenv
NOOKA_AUTH_ENABLED=false
NOOKA_FIREBASE_PROJECT_ID=
NOOKA_FIREBASE_CREDENTIALS=
```

Firebase beans không được khởi tạo; local security permit request một cách tường minh.

### Bật auth

1. Tạo service-account JSON cho Firebase project.
2. Lưu JSON **ngoài repository**.
3. Điền `.env`:

```dotenv
NOOKA_AUTH_ENABLED=true
NOOKA_FIREBASE_PROJECT_ID=your-firebase-project-id
NOOKA_FIREBASE_CREDENTIALS="C:\path\outside\repo\firebase-service-account.json"
```

4. Kiểm tra rồi chạy:

```powershell
.\run.ps1 -Check
.\run.ps1
```

`run.ps1` chỉ resolve đường dẫn và export thành `GOOGLE_APPLICATION_CREDENTIALS`; script không đọc hoặc in nội dung JSON. Nếu `NOOKA_FIREBASE_CREDENTIALS` để trống, Firebase Admin thử Application Default Credentials đã tồn tại trên máy và startup sẽ fail-closed nếu không tìm thấy.

Luồng xác thực:

1. Mobile đăng nhập Firebase và nhận Firebase ID token.
2. Mobile gửi `Authorization: Bearer <id-token>`.
3. Backend gọi Firebase Admin `verifyIdToken`.
4. Firebase UID đã verify trở thành principal; backend không tin `userId` do client tự gửi.

Compose foundation hiện không tự mount Firebase credential từ host. Muốn bật auth khi chạy container cần một Compose override/secret mount riêng; `run.ps1` hỗ trợ auth khi chạy Spring Boot trực tiếp trên host.

## Chạy toàn bộ bằng Docker

```bash
docker compose --env-file .env -f infra/compose.yaml up --build -d
curl http://localhost:8080/actuator/health
```

Compose chạy PostgreSQL và API. Local compose tắt authentication một cách **tường minh** bằng `NOOKA_AUTH_ENABLED=false` và bật OpenAPI; production không được dùng cấu hình này.

Dừng services:

```bash
docker compose --env-file .env -f infra/compose.yaml down
```

## Chạy Maven trực tiếp

Lệnh Maven thô không tự đọc `.env`:

```powershell
$env:AUTH_ENABLED='false'
$env:OPENAPI_ENABLED='true'
.\mvnw.cmd spring-boot:run
```

Khi chạy trực tiếp, Spring dùng các biến runtime `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `PORT`, `AUTH_ENABLED`, `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` và `OPENAPI_ENABLED`. Ưu tiên dùng `run.ps1` để mapping thống nhất.

Production/default là secure-by-default: `AUTH_ENABLED=true`. Khi đó bắt buộc cung cấp `FIREBASE_PROJECT_ID` và Application Default Credentials phù hợp.

## Endpoint hạ tầng

| Endpoint | Điều kiện |
|---|---|
| `/actuator/health` | luôn expose |
| `/actuator/info` | luôn expose |
| `/v3/api-docs` | `OPENAPI_ENABLED=true` |
| `/swagger-ui.html` | `OPENAPI_ENABLED=true` |

Foundation hiện chưa có business endpoint.

## Chạy test

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-run.ps1
.\mvnw.cmd test
```

Test repository/Flyway dùng PostgreSQL thật qua Testcontainers nên Docker phải chạy. Các guard kiến trúc có thể chạy riêng không cần Docker:

```powershell
.\mvnw.cmd "-Dtest=ModularityTest,ArchitectureTest,ApiExceptionHandlerTest,SecurityConfigTest,BearerTokenAuthenticationFilterTest,FirebaseConfigTest,OpenApiEndpointTest" test
```

## Biến `.env`

| Biến | Mẫu local | Ghi chú |
|---|---|---|
| `COMPOSE_PROJECT_NAME` | `nooka` | namespace network/volume của Compose |
| `NOOKA_DB_NAME` | `nooka` | map vào `POSTGRES_DB` và `DB_NAME` |
| `NOOKA_DB_USER` | `nooka` | local only |
| `NOOKA_DB_PASSWORD` | `replace-me-local` | tự đổi; local only |
| `NOOKA_DB_PORT` | `5432` | cổng PostgreSQL publish ra host |
| `NOOKA_API_PORT` | `8080` | cổng API publish ra host |
| `NOOKA_AUTH_ENABLED` | `false` | chỉ tắt auth cho local |
| `NOOKA_FIREBASE_PROJECT_ID` | rỗng | bắt buộc khi bật auth |
| `NOOKA_FIREBASE_CREDENTIALS` | rỗng | host path cho `run.ps1`; không commit JSON |
| `NOOKA_OPENAPI_ENABLED` | `true` | chỉ bật docs cho local |

Không commit credential Firebase, R2, database production hoặc token.

## Kiến trúc package

```text
com.vinhung.nookaapi
├── shared/      primitive và error contract dùng chung
├── user/        account và relationship graph
├── spot/        City, Area, Spot, Place, Experience
├── post/        Post, visibility policy, PostAccess
└── platform/    security và OpenAPI adapter
```

- Module khác chỉ dùng named interface `api`, `query` hoặc `spi` được công bố.
- Entity/repository là internal; controller không được import chúng.
- `PostRepository` chỉ được dùng trong `post.repository`.
- Mọi đọc Post đi qua `post.api.PostAccess`; visibility luôn nằm trong SQL.
- Cross-module entity association đã được thay bằng UUID để tránh coupling persistence.
- Package tương lai dùng `package-info.java`, không dùng `.gitkeep`.
- Lombok dùng có chủ đích; không dùng `@Data` hoặc generated equality cho entity kế thừa `BaseEntity`.

## Database

Flyway sở hữu schema; Hibernate luôn dùng `ddl-auto: validate`.

- `V1__baseline.sql`: schema vertical slice hiện có.
- `V2__modulith_event_publication.sql`: event publication registry của Spring Modulith.

Không sửa migration đã chạy trên database dùng chung. Thay đổi schema tiếp theo dùng forward migration mới.

## Ghi chú Docker/Testcontainers

Docker Engine 29 yêu cầu API tối thiểu 1.44. `pom.xml` truyền system property `api.version=1.44` cho test để tương thích Testcontainers 1.21.3. Chỉ bỏ workaround sau khi xác minh phiên bản Testcontainers mới tự thương lượng thành công.
