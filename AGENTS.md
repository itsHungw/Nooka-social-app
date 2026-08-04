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
