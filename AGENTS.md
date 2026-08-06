# AGENTS.md

Repo gốc của Nooka. Ba phần nằm chung một Git repo:

| Thư mục | Là gì | Luật riêng |
|---|---|---|
| `nooka-api/` | Backend Spring Boot + PostgreSQL | [`nooka-api/AGENTS.md`](nooka-api/AGENTS.md) |
| `nooka-mobile/` | App React Native + Expo | [`nooka-mobile/AGENTS.md`](nooka-mobile/AGENTS.md) |
| `nooka-docs/` | Spec sản phẩm, kiến trúc, API contract. Không có code chạy được | — |

**Đọc file `AGENTS.md` của thư mục bạn đang sửa trước khi viết dòng code đầu tiên.** File này chỉ là bản đồ và những luật đi xuyên cả ba.

## Trước khi bắt đầu

```bash
git config core.hooksPath .githooks
```

Chạy một lần cho mỗi clone. `core.hooksPath` là cấu hình cục bộ nên **không đi theo repo** — clone mới là phải chạy lại, và không có cách nào ép từ phía repo. Hook chặn commit không qua `lint` và `tsc`; xem [`.githooks/pre-commit`](.githooks/pre-commit).

## Nguồn sự thật

1. Yêu cầu trực tiếp của người dùng.
2. Product spec: [`nooka-docs/product/specs/2026-07-27-nooka-design.md`](nooka-docs/product/specs/2026-07-27-nooka-design.md) — quyết định *cái gì*.
3. Architecture doc: [`nooka-docs/architecture/2026-07-28-nooka-api-architecture.md`](nooka-docs/architecture/2026-07-28-nooka-api-architecture.md) — quyết định *dựng thế nào* cho backend.
4. Migration, source và test hiện tại.

Tài liệu mâu thuẫn với code đang chạy: nêu rõ mâu thuẫn, sửa cả hai nếu phạm vi cho phép. Không âm thầm chọn một bên.

## Ranh giới giữa ba thư mục

- Được yêu cầu sửa một thư mục thì **chỉ sửa thư mục đó**. Thay đổi lan sang thư mục khác phải nói ra trước.
- API contract đi một chiều: `nooka-api` sinh `openapi.json` → commit vào `nooka-docs/contracts/` → `nooka-mobile` generate TypeScript client. Không ai viết tay DTO ở phía client.
- Không có submodule giữa ba thư mục. Đây là một repo phẳng.

## Luật xuyên suốt

**Privacy là ràng buộc sản phẩm, không phải tính năng.** §13 và §20 của spec khoá hai điều, cả backend lẫn mobile đều phải giữ:

- **R1** — EXIF strip ở **server**. Client không bao giờ được coi là đã sạch.
- **R2** — Mọi truy vấn chạm tới Post phải đi qua một điểm nghẽn ép luật visibility. Spring Boot không có Row Level Security; không có lưới an toàn nào phía dưới.

Ngoài ra: không real-time location tracking. Nội dung `PRIVATE` không vào log, analytics, crash report hay context gửi cho AI. Không log token.

**Secret** chỉ đến từ environment hoặc secret manager. Không commit credential, service account key, keystore hay token — ở bất kỳ thư mục nào.

**Context7 là bắt buộc** khi làm việc với framework, thư viện hay SDK: đọc tài liệu đúng phiên bản trước khi viết code, đối chiếu với `pom.xml` / `package.json` thật. Không nâng version chỉ vì có bản mới hơn.

## Kỷ luật thay đổi

- `git status --short` trước khi sửa. Không ghi đè thay đổi chưa commit của người khác.
- Không tạo commit, branch hay worktree nếu chưa được yêu cầu.
- Không refactor ngoài phạm vi.
- Cập nhật `AGENTS.md` tương ứng khi chốt thêm một quy ước, hoặc khi một luật ở đó không còn đúng.
## Quy ước kiến trúc backend

Khi thêm feature mới trong `nooka-api/`, tuân thủ cấu trúc theo feature và tách trách nhiệm rõ ràng:

```text
<feature>/
├── controller/        # REST endpoints
├── service/           # business logic và use case
├── repository/        # Spring Data JPA repositories, chỉ khi feature có persistence
├── model/
│   ├── entity/        # JPA entities, chỉ khi feature có persistence
│   ├── dto/           # request/response DTOs
│   └── enums/         # feature enums xuất hiện trong contract
├── mapper/            # entity <-> DTO mappers, chỉ khi mapping đủ phức tạp
├── integration/       # external provider clients
└── config/            # feature-specific configuration
```

Không tạo folder rỗng hoặc thêm MapStruct/JPA chỉ để khớp cây thư mục. Feature không có database không cần `repository/`, `model/entity/` hay `mapper/`. Controller chỉ nhận/validate request, service điều phối business logic, integration gọi provider, DTO là boundary của API và secret chỉ đọc từ environment/secret manager.
## Quyết định location mới — August 6, 2026

User đã chốt foreground GPS cho tab Search: khi Search đang mở và user đã cấp quyền, mobile được cập nhật chấm xanh theo chuyển động. Không dùng background location, không lưu lịch sử di chuyển, không gửi tọa độ định kỳ. Route preview chỉ gửi một tọa độ origin tại thời điểm user bấm `Directions`; backend không tracking location.
