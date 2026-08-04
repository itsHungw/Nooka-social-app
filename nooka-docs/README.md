# nooka-docs

Nguồn sự thật chung cho dự án Nooka: quyết định sản phẩm, kiến trúc, và API contract.

Repo này **không chứa code chạy được**. Nó tồn tại riêng để có thể chia sẻ spec mà không cần cấp quyền vào source, và để sống lâu hơn bất kỳ lần viết lại nào của backend hay mobile.

## Cấu trúc

```
product/specs/      Spec sản phẩm, research, roadmap
architecture/       Quyết định kiến trúc từng repo
contracts/          OpenAPI contract — sinh từ nooka-api, không sửa tay
```

## Tài liệu hiện có

| Tài liệu | Nội dung |
|---|---|
| [product/specs/2026-07-27-nooka-design.md](product/specs/2026-07-27-nooka-design.md) | Spec sản phẩm đầy đủ: định vị, mô hình social, hai chế độ, search, dữ liệu, vertical slice, cold start, business, tech stack |
| [architecture/2026-07-28-nooka-api-architecture.md](architecture/2026-07-28-nooka-api-architecture.md) | Kiến trúc backend: bản đồ module, quy ước package, ranh giới ép bằng Modulith và ArchUnit, đường đọc/ghi Post, event xuyên module, schema |

Khi hai tài liệu xung đột: tài liệu sản phẩm ưu tiên về *cái gì*, tài liệu kiến trúc ưu tiên về *dựng thế nào*.

## Các thư mục khác

| Thư mục | Trách nhiệm |
|---|---|
| `nooka-api` | Spring Boot — business rules, phân quyền, database, media, notification |
| `nooka-mobile` | Expo — UI, state, offline, i18n, push |
| `nooka-web` | Chưa tồn tại. Thêm khi cần, dùng chung API |

Cả ba nằm trong **một** Git repo: `Nooka-social-app` (`github.com/itsHungw/Nooka-social-app`). Không có repo lồng, không có submodule. Luật chung cho cả ba ở `../AGENTS.md`.

## Quy trình API contract

Code-first: `nooka-api` sinh `openapi.json` từ annotation, commit vào `contracts/`, `nooka-mobile` generate TypeScript client từ đó. Không ai viết DTO bằng tay ở phía client.

Chuyển sang contract-first khi `nooka-web` xuất hiện hoặc khi có người thứ hai tham gia — lúc đó chi phí điều phối mới có thật.

## Trạng thái

Spec ở trạng thái **chờ duyệt**. Tên `Nooka` là codename, chưa tra nhãn hiệu.
