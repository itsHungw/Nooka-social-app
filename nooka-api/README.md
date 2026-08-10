# nooka-api

Backend của Nooka. Java 21, Spring Boot 4.1, PostgreSQL 17, Flyway, Spring Modulith và Spring Security.

## Yêu cầu

- JDK 21
- Docker Desktop/Engine
- Windows PowerShell 5.1+ để dùng `run.ps1`

### PostgreSQL phải có PostGIS

Từ migration `V3_1`, schema cần hai extension `postgis` và `pg_trgm`. Chúng phục vụ yêu cầu chống trùng địa điểm của product spec §7: so toạ độ trong bán kính (`ST_DWithin`) và so tên gần giống (`similarity`).

Image `postgres:17-alpine` **không** có PostGIS, nên cả `infra/compose.yaml` lẫn Testcontainers đều dùng `postgis/postgis:17-3.5-alpine`.

Nếu bạn chạy một PostgreSQL cài sẵn ngoài Docker, cài PostGIS 3.5 trước khi chạy migration — không có nó thì `V3_1` thất bại ngay dòng đầu.

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
3. Khởi động PostgreSQL và Redis bằng Compose, rồi đợi cả hai container healthy.
4. Chạy `mvnw.cmd spring-boot:run`.

Các lựa chọn khác:

```powershell
.\run.ps1 -SkipDatabase
.\run.ps1 -EnvFile .env.local
```

`-SkipDatabase` dùng khi PostgreSQL và Redis đã chạy. PostgreSQL và Redis mặc định tiếp tục chạy sau khi app dừng để giữ dữ liệu local.

## Custom email/password auth local

Backend tự quản lý email/password, email verification OTP, password reset và persistent sessions. Password được hash bằng BCrypt; access token sống ngắn và refresh token được rotate/lưu hash trong PostgreSQL.

Khi chạy local chưa cấu hình SMTP, đặt:

```dotenv
NOOKA_AUTH_ENABLED=false
NOOKA_AUTH_EMAIL_ENABLED=false
```

Để gửi OTP thật, cấu hình SMTP qua environment:

```dotenv
NOOKA_AUTH_ENABLED=true
NOOKA_AUTH_EMAIL_ENABLED=true
NOOKA_AUTH_EMAIL_HOST=smtp.example.com
NOOKA_AUTH_EMAIL_PORT=587
NOOKA_AUTH_EMAIL_USERNAME=
NOOKA_AUTH_EMAIL_PASSWORD=
NOOKA_AUTH_EMAIL_FROM=noreply@example.com
```

Mobile gọi `/auth/register`, `/auth/verify-email`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password` và `/auth/reset-password`. Refresh token không được log hoặc lưu trong plain text.

### OAuth Google, Apple và Facebook

OAuth cũng đi qua backend để provider token được verify server-side trước khi tạo session Nooka. Backend không nhận `userId` từ mobile và không lưu provider access token.

```dotenv
NOOKA_OAUTH_GOOGLE_CLIENT_ID=your-google-client-id
NOOKA_OAUTH_APPLE_CLIENT_ID=your-apple-services-id-or-client-id
NOOKA_OAUTH_FACEBOOK_APP_ID=your-facebook-app-id
NOOKA_OAUTH_FACEBOOK_APP_SECRET=your-facebook-app-secret
NOOKA_OAUTH_FACEBOOK_GRAPH_BASE_URL=https://graph.facebook.com
```

Các endpoint là `/auth/oauth/google`, `/auth/oauth/apple` và `/auth/oauth/facebook`. Khi provider trả về email đã verify, backend liên kết `oauth_accounts` với user hiện có cùng email hoặc tạo user mới; provider account đã liên kết có thể đăng nhập lại dù provider không gửi email ở các lần sau. App secret của Facebook chỉ được đặt ở backend, không đưa vào Expo/mobile.

## Chạy toàn bộ bằng Docker

```bash
docker compose --env-file .env -f infra/compose.yaml up --build -d
curl http://localhost:8080/actuator/health
```

Compose chạy PostgreSQL, Redis và API. Redis lưu route preview theo TTL; local compose tắt authentication một cách **tường minh** bằng `NOOKA_AUTH_ENABLED=false` và bật OpenAPI; production không được dùng cấu hình này.

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

Khi chạy trực tiếp, Spring dùng DB_*, PORT, AUTH_ENABLED, AUTH_EMAIL_*, OAUTH_* và OPENAPI_ENABLED. Ưu tiên dùng run.ps1 để mapping thống nhất.

Production/default là secure-by-default: AUTH_ENABLED=true. Cấu hình SMTP khi bật AUTH_EMAIL_ENABLED=true.

## Endpoint hạ tầng

| Endpoint | Điều kiện |
|---|---|
| `/actuator/health` | luôn expose |
| `/actuator/info` | luôn expose |
| `/v3/api-docs` | `OPENAPI_ENABLED=true` |
| `/swagger-ui.html` | `OPENAPI_ENABLED=true` |

Create check-in dùng `POST /v1/posts/check-ins` (`multipart/form-data`) với part JSON `post`, 1–5 part `photos` và header UUID `Idempotency-Key`. Part JSON chứa crop 4:5 riêng theo đúng thứ tự ảnh; `SELECTED_FRIENDS` nhận tối đa 50 mutual-friend UUID và bị PostAccess kiểm lại lúc đọc. Ảnh chỉ được công bố sau khi server decode/re-encode và lưu bản đã strip metadata.

## Chạy test

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-run.ps1
.\mvnw.cmd test
```

Test repository/Flyway dùng PostgreSQL thật qua Testcontainers nên Docker phải chạy. Các guard kiến trúc có thể chạy riêng không cần Docker:

```powershell
.\mvnw.cmd "-Dtest=ModularityTest,ArchitectureTest,ApiExceptionHandlerTest,SecurityConfigTest,BearerTokenAuthenticationFilterTest,OpenApiEndpointTest" test
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
| `NOOKA_REDIS_PORT` | `6379` | cổng Redis publish ra host |
| `NOOKA_REDIS_PASSWORD` | rỗng | password Redis local; không commit secret |
| `NOOKA_AUTH_ENABLED` | `false` | chỉ tắt auth cho local |
| `NOOKA_AUTH_EMAIL_HOST` | rỗng | SMTP host khi gửi OTP |
| `NOOKA_AUTH_EMAIL_ENABLED` | `false` | bật gửi OTP qua SMTP |
| `NOOKA_AUTH_EMAIL_PORT` | `587` | SMTP port |
| `NOOKA_AUTH_EMAIL_USERNAME` | rỗng | SMTP username; không commit |
| `NOOKA_AUTH_EMAIL_PASSWORD` | rỗng | SMTP password; không commit |
| `NOOKA_AUTH_EMAIL_FROM` | rỗng | địa chỉ gửi email |
| `NOOKA_OAUTH_GOOGLE_CLIENT_ID` | rỗng | Google client ID cho ID token |
| `NOOKA_OAUTH_APPLE_CLIENT_ID` | rỗng | Apple client/services ID |
| `NOOKA_OAUTH_FACEBOOK_APP_ID` | rỗng | Facebook app ID |
| `NOOKA_OAUTH_FACEBOOK_APP_SECRET` | rỗng | Facebook app secret; backend-only |
| `NOOKA_OAUTH_FACEBOOK_GRAPH_BASE_URL` | `https://graph.facebook.com` | override khi cần |
| `NOOKA_OPENAPI_ENABLED` | `true` | chỉ bật docs cho local |
| `DIRECTIONS_PROVIDER` | `mapbox` | `mapbox` (default) hoặc `google` |
| `MAPBOX_ACCESS_TOKEN` | rỗng | bắt buộc khi dùng mapbox; không commit |
| `MAPBOX_DIRECTIONS_BASE_URL` | `https://api.mapbox.com` | override nếu cần |
| `DIRECTIONS_CACHE_ENABLED` | `true` | bật route preview cache |
| `DIRECTIONS_CACHE_TTL` | `PT15M` | TTL Redis cho route preview |
| `DIRECTIONS_CACHE_KEY_PREFIX` | `nooka:directions:route:v1` | namespace/version của cache |
| `DIRECTIONS_CACHE_ORIGIN_GRID_DECIMALS` | `3` | gom origin khoảng 100m để tăng cache hit |
| `DIRECTIONS_CACHE_DESTINATION_GRID_DECIMALS` | `5` | giữ destination chính xác hơn |
| `GOOGLE_ROUTES_API_KEY` | rỗng | fallback; không commit |
| `GOOGLE_ROUTES_BASE_URL` | `https://routes.googleapis.com` | override nếu cần |
| `NOOKA_MEDIA_PROVIDER` | `local` | `local` cho dev/test hoặc `r2` cho production |
| `NOOKA_MEDIA_LOCAL_ROOT` | thư mục temp | nơi giữ ảnh private khi chạy local |
| `NOOKA_R2_ENDPOINT` | rỗng | endpoint S3-compatible của Cloudflare R2 |
| `NOOKA_R2_REGION` | `auto` | signing region của R2 |
| `NOOKA_R2_BUCKET` | rỗng | bucket private; không bật public access |
| `NOOKA_R2_ACCESS_KEY` | rỗng | backend-only; không commit |
| `NOOKA_R2_SECRET_KEY` | rỗng | backend-only; không commit |

Không commit credential custom auth, R2, database production hoặc token.

## Kiến trúc package

```text
com.vinhung.nookaapi
├── shared/      primitive và error contract dùng chung
├── user/        account và relationship graph
├── spot/        City, Area, Spot, Place, Experience
├── post/        Post, visibility policy, PostAccess
├── media/       decode/re-encode, EXIF strip và storage port
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
