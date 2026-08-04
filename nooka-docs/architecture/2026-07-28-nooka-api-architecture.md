# nooka-api — Kiến trúc backend

| | |
|---|---|
| **Ngày** | 2026-07-28 |
| **Trạng thái** | Đã chốt qua brainstorm, chờ review trước khi lập implementation plan |
| **Phạm vi** | Vertical slice ở §10 của spec sản phẩm |
| **Tài liệu cha** | [product/specs/2026-07-27-nooka-design.md](../product/specs/2026-07-27-nooka-design.md) — khi xung đột, tài liệu sản phẩm ưu tiên cao hơn về *cái gì*, tài liệu này ưu tiên cao hơn về *dựng thế nào* |

---

## 1. Vì sao có tài liệu này

`nooka-api` hiện có 16 file Java: entity, một Specification, một gateway đọc Post. Không có controller, không có DTO, không có exception handler, không có security. Endpoint chạy được duy nhất là `/actuator/health`.

Nói cách khác, dự án có một **tầng dữ liệu**, chưa có **kiến trúc**. Không có câu trả lời cho: DTO ở đâu, transaction mở ở đâu, `viewerId` đi từ JWT xuống `PostAccess` bằng đường nào, module nào được gọi module nào. Mỗi file tiếp theo là một lần đoán, và các lần đoán không giống nhau — đó là định nghĩa của "khó đọc, khó bảo trì".

Ba triệu chứng cụ thể đã quan sát được:

- **Schema chạy trước code.** `V1__baseline.sql` tạo 18 bảng; chỉ 10 bảng có entity. Tám bảng — `post_media`, `post_vibe_tags`, `reactions`, `comments`, `want_to_go`, `been`, `reports`, `notifications` — chưa ai đọc, chưa ai ghi. `ddl-auto: validate` không kêu vì nó chỉ soi entity đang tồn tại, nên lưới an toàn im lặng đúng lúc cần nó lên tiếng.
- **Một quả mìn lazy loading đã cài sẵn.** `PostAccess` trả về entity, `open-in-view` đang tắt. Controller đầu tiên trả thẳng `Post` ra JSON sẽ nổ `LazyInitializationException` ở `author` và `spot`.
- **Đọc không giới hạn.** `findVisibleTo(viewerId)` trả `List<Post>` không phân trang, không giới hạn.

Tài liệu này chốt kiến trúc để ba thứ đó không tái diễn, và để ràng buộc R2 ở §20 được máy kiểm chứ không được nhắc bằng comment.

---

## 2. Quyết định đã chốt

| # | Quyết định | Lý do một dòng |
|---|---|---|
| D1 | Package-by-feature ở cấp một, n-layer bên trong mỗi module | Đọc code theo nghiệp vụ, không theo kỹ thuật |
| D2 | Ranh giới module ép bằng **Spring Modulith 2.1.0** | Luật không được máy kiểm là luật sẽ bị phá |
| D3 | Ranh giới **trong** module ép bằng **ArchUnit** | Modulith chỉ kiểm liên module |
| D4 | Mỗi module công bố `api/`; `spi/` chỉ khi có port thật | Không tạo package rỗng cho đủ bộ |
| D5 | Adapter kéo theo SDK bên thứ ba nằm ở `platform/` | Module nghiệp vụ test được mà không cần credential |
| D6 | `controller` không được chạm `entity` và `repository` | Gỡ mìn lazy loading ở mức luật, không mức kỷ luật |
| D7 | Không API nào trả collection không phân trang | Nguồn gốc "ko reliable" |
| D8 | Lọc quyền xem nằm trong SQL; làm giàu dữ liệu tra theo lô | R2 bắt buộc; đồng thời triệt N+1 |
| D9 | Side-effect xuyên module đi bằng event, **eventual consistency** | `post` không biết `spot` và `notification` tồn tại |
| D10 | `viewerId` truyền tường minh, không ThreadLocal | Null ngầm ở đây là lỗ hổng, không phải exception |
| D11 | Event publication registry dùng **`starter-jdbc`**, không phải `-jpa` | Tránh xung đột với `ddl-auto: validate` |
| D12 | Chia lại `V1` theo module trước khi commit | Cửa sổ này chỉ mở một lần |
| D13 | `follows` / `close_friends` / `blocks` **ở lại** module `user` ở MVP | Chưa đủ đau để tách module `social` |
| D14 | `schema-initialization.enabled: false` **khai tường minh** | Mặc định thật là bật, xem §8 |
| D15 | `completion-mode: delete` | Mặc định `UPDATE` làm bảng phình vô hạn |
| D16 | Chống trùng notification bằng unique key ở DB, không dựa vào FCM | FCM không có idempotency key |

---

## 3. Bản đồ module

Spring Modulith coi mỗi package cấp một dưới `com.vinhung.nookaapi` là một application module. Cắt theo capability nghiệp vụ ở §10, không cắt theo kỹ thuật.

```
com.vinhung.nookaapi
│
├── shared/            BaseEntity, kiểu chung, lỗi nền. Không phụ thuộc ai.
│
├── user/              Account, Follow, CloseFriend, Block
├── spot/              City, Area, Place, Experience, WantToGo, Been, chống trùng
├── post/              Post, Visibility, media ref, Reaction, Comment, follow-up link
├── media/             Upload, strip EXIF (R1), vòng đời file
├── notification/      Notification row + đẩy push
├── moderation/        Report
│
└── platform/          Adapter ra thế giới ngoài. KHÔNG chứa nghiệp vụ.
    ├── security/        Spring Security filter, principal
    ├── firebase/        implements user.spi.TokenVerifier
    ├── r2/              implements media.spi.MediaStorage
    └── fcm/             implements notification.spi.PushSender
```

### Không tạo module `feed` và `search`

Feed ở bản đầu chính là `PostAccess.feedFor(...)`. Thêm một module rỗng chỉ để có tên là bừa. Khi ranking thật xuất hiện, `feed` tách ra và phụ thuộc `post :: api`, không chạm `post.repository`. Search tương tự.

### `Want to go` và `Been` thuộc `spot`, không thuộc `post`

§7 khóa cứng: *"User thích một bài đăng, nhưng thứ họ muốn đi và lưu là một địa điểm."* Đặt sai chỗ là nơi dữ liệu bắt đầu rối.

### Chiều phụ thuộc giữa module

Quy tắc một dòng:

> **Đọc và validate đồng bộ thì gọi qua `:: api`. Thay đổi state của module khác thì đi bằng event.**

Áp vào `post`:

```
post  ──▶  user :: api      đọc tên, avatar tác giả
post  ──▶  user :: query    mảnh criteria lọc quyền xem trong SQL (§7)
post  ──▶  spot :: api      validate spot tồn tại, đọc tên spot cho feed

post  ──PostCreated──▶  spot           bật Been          side-effect, bất đồng bộ
post  ──PostCreated──▶  notification   tạo row + push    side-effect, bất đồng bộ

post   ──X──▶  spot.service, spot.repository        internal, Modulith chặn
post   ──X──▶  notification.*                       không gọi trực tiếp, kể cả api
media  ──X──▶  platform.r2                          media không biết R2 tồn tại

platform  ──▶  <module>.spi     adapter cắm vào port
mọi thứ   ──▶  shared
```

Hai dòng đáng chú ý. `post ──▶ spot :: api` **được phép** — đọc và validate là đồng bộ, và §6 dùng nó để tra tên spot theo lô. Nhưng `post` không bao giờ *ghi* vào `spot`; việc bật `Been` đi bằng `PostCreated`. Còn `notification` thì `post` không gọi cả `api` — nó thuần tuý là bên nhận event, nên không có lý do gì để `post` biết tên nó.

---

## 4. Quy ước package trong một module

Giữ cách đặt tên quen thuộc của Spring, thêm `api/` và — khi cần — `spi/`.

```
post/
├── package-info.java           @ApplicationModule(...)
│
├── api/                        @NamedInterface("api")
│   ├── package-info.java
│   ├── PostAccess.java               interface — hợp đồng đọc
│   ├── PostCardView.java             record
│   ├── PostDetailView.java           record
│   ├── Visibility.java               enum — có mặt trong contract
│   └── PostCreated.java              record — event
│
├── controller/                 PostController.java
├── dto/
│   ├── request/                      CreatePostRequest.java
│   └── response/                     PostResponse.java
├── service/                          PostCommandService.java
├── entity/                           Post.java
├── enums/                            enum chỉ dùng trong module
├── exception/                        PostNotFoundException.java
└── repository/
    ├── PostRepository.java           public ở cấp Java, internal ở cấp module
    ├── JpaPostAccess.java            implements api.PostAccess — package-private
    ├── PostStore.java                interface — cửa ghi, nội bộ module
    ├── JpaPostStore.java             implements PostStore — package-private
    └── PostVisibilityRules.java      package-private
```

Mỗi interface có đúng một class cài đặt, và class đó **package-private**. Không interface nào tự cài đặt chính nó: `PostRepository` không extends `PostStore`, vì `JpaRepository` đã có `save(...)` riêng và trộn hai thứ lại sẽ khiến không ai biết `save` nào đang chạy.

Module có outbound port thì thêm `spi/`:

```
notification/
├── api/
├── spi/
│   ├── package-info.java       @NamedInterface("spi")
│   └── PushSender.java
└── ...

platform/fcm/FcmPushSender.java   implements notification.spi.PushSender
```

`spi/` **chỉ tạo khi có port thật**. `media/spi/MediaStorage`, `notification/spi/PushSender`, `user/spi/TokenVerifier` có. `post/spi`, `spot/spi`, `moderation/spi` không tạo.

### Package gốc của module để trống

Modulith coi package gốc là *unnamed named interface* — thứ gì đặt ở đó là tự động công bố. Giữ nó chỉ có `package-info.java`:

```java
// post/package-info.java
@org.springframework.modulith.ApplicationModule(
    allowedDependencies = { "user :: api", "user :: query", "spot :: api" }
)
package com.vinhung.nookaapi.post;
```

```java
// post/api/package-info.java
@org.springframework.modulith.NamedInterface("api")
package com.vinhung.nookaapi.post.api;
```

### `api/` chứa gì và không chứa gì

**Chứa:** interface, record view, record event, enum xuất hiện trong contract.

**Không chứa:**

- `@Entity` và mọi kiểu persistence — `jakarta.persistence.*`, Criteria API, `Specification`.
- Spring stereotype — `@Service`, `@Repository`, `@RestController`, `@Component`.

**Được phép, có chủ ý:** kiểu hạ tầng nhẹ đã chọn làm chuẩn chung của dự án — `Pageable`, `Slice`, `Page` của Spring Data, và `@Nullable` của JSpecify.

Ranh giới ở đây không phải "cấm mọi thứ có chữ Spring", mà là **cấm thứ ràng `api/` vào tầng lưu trữ hoặc vào vòng đời bean**. `Slice<PostCardView>` không kéo theo entity nào và không tạo phụ thuộc nào lên Hibernate; nó chỉ là một record có `content` và `hasNext`. Tự viết `SliceView` và `CursorRequest` riêng để tránh chữ "Spring" là thêm một lớp dịch cho một monolith nội bộ — chưa đáng ở MVP. Ghi lại đây để sau này ai muốn đổi thì biết đây là quyết định, không phải sơ suất.

Ngược lại, `@Entity` lọt vào `api/` là entity rò ra toàn hệ thống và lazy loading quay lại. Kiểu Criteria lọt vào là hợp đồng công bố bắt đầu phụ thuộc tầng lưu trữ — chỗ duy nhất trong dự án buộc phải làm thế là mảnh criteria lọc quyền xem, và nó có named interface riêng tên `query`, xem §7.

*(`@Nullable` ở đây là `org.jspecify.annotations.Nullable`, đúng thứ code hiện tại đang dùng. JSpecify là chuẩn trung lập, không phải kiểu của Spring — Spring Framework 7 cũng đã chuyển sang nó.)*

### Khi nào tạo interface

> Chỉ tạo interface khi nó ngăn hai package không được nhìn thấy nhau, hoặc khi nó là chỗ cắm provider.

`PostAccess` có interface: nó là hợp đồng công bố, impl phải nằm cạnh repository. `MediaStorage` có: đó là chỗ cắm provider. `PostCommandService` **không** có: nó chỉ có một implementation và sẽ mãi chỉ có một. Interface một-implementation là thêm file để đọc mà không thêm ranh giới nào.

---

## 5. Luật phụ thuộc trong module

| Package | Được import | Cấm |
|---|---|---|
| `api` | `shared` | phần còn lại của chính module |
| `spi` | `shared`, `api` | phần còn lại của chính module |
| `entity` | `shared`, `api`, `enums` | `controller`, `service`, `repository`, `dto` |
| `repository` | `shared`, `api`, `entity`, `enums`, `exception` | `controller`, `dto`, `service` |
| `service` | `shared`, `api`, `spi`, `entity`, `enums`, `exception`, `repository` | `controller`, `dto` |
| `dto` | `shared`, `api`, `enums` | `entity`, `repository`, `service` |
| `controller` | `shared`, `api`, `dto`, `service`, `exception` | **`entity`, `repository`** |

Modulith không kiểm ranh giới giữa các package **bên trong** một module. Phần đó thuộc ArchUnit (§10).

---

## 6. Đọc và ghi Post — ràng buộc R2

§20 của spec sản phẩm: *"Spring Boot không có Row Level Security, nên bốn mức visibility ở §13 phải được ép trong mọi truy vấn chạm tới Post."*

Code hiện tại đạt điều đó bằng `PostRepository` package-private. **Cơ chế đó không sống sót qua cấu trúc n-layer**: `post.service.PostCommandService` và `post.repository.PostRepository` ở hai Java package khác nhau, nên package-private chặn luôn cả đường ghi hợp lệ.

Thay bằng ba lớp bảo vệ:

**1. `PostRepository` public ở cấp Java, internal ở cấp module.** Nó nằm trong `post.repository`, không nằm trong `post :: api`, nên Modulith verification chặn mọi module khác import vào.

**2. Một luật ArchUnit khoá nó trong package của nó.** Nhận diện bằng FQCN, không bằng simple name — simple name sẽ khớp nhầm khi có `PostRepository` thứ hai ở đâu đó.

```java
@ArchTest
static final ArchRule only_post_repository_package_may_use_post_repository =
    noClasses()
        .that().resideOutsideOfPackage("..post.repository..")
        .should().dependOnClassesThat()
        .haveFullyQualifiedName("com.vinhung.nookaapi.post.repository.PostRepository");
```

**3. Hai cửa, mỗi cửa một luật.** `post.repository` là package duy nhất được chạm `PostRepository`. Phần còn lại của module tới được Post qua đúng hai đường — hợp đồng đọc `api.PostAccess`, cài đặt nằm trong `repository`; và cửa ghi `repository.PostStore`:

```java
// post/api/PostAccess.java — ĐỌC. visibleTo luôn được ghép.
public interface PostAccess {
    Slice<PostCardView> feedFor(@Nullable UUID viewerId, Pageable pageable);
    Optional<PostDetailView> detail(UUID postId, @Nullable UUID viewerId);
}
```

```java
// post/repository/PostStore.java — GHI. Internal, không công bố ra ngoài module.
public interface PostStore {
    Post save(Post post);
    Optional<Post> findOwnedBy(UUID postId, UUID authorId);
}
```

```java
// post/repository/JpaPostStore.java — package-private
@Component
class JpaPostStore implements PostStore {

    private final PostRepository repository;

    JpaPostStore(PostRepository repository) {
        this.repository = repository;
    }

    @Override
    public Post save(Post post) {
        return repository.save(post);
    }

    @Override
    public Optional<Post> findOwnedBy(UUID postId, UUID authorId) {
        return repository.findByIdAndAuthorId(postId, authorId);
    }
}
```

**Không cho `PostRepository extends PostStore`.** Nhìn thì tiết kiệm được một class, nhưng `JpaRepository` đã khai `save(S entity)` với ngữ nghĩa riêng, và `PostStore.save(Post)` trùng chữ ký. Gộp lại thì đọc code không biết `save` nào đang chạy, và mất luôn chỗ để chèn kiểm tra khi cần. Một class thừa rẻ hơn một chữ ký nhập nhằng.

`findOwnedBy` thay cho `findById`: sửa và xoá không bao giờ nạp được bài của người khác, và điều đó đúng theo chữ ký hàm chứ không theo một `if` mà ai đó phải nhớ viết.

`PostStore` **không** là named interface. Module khác không sửa Post của người khác — chúng phát event, `post` tự xử lý.

### `api/` không trả entity, nên đọc bằng projection

Feed cần 20 bài kèm tên tác giả, avatar, tên spot, tên khu vực, ảnh, số reaction. Trả `List<Post>` thì hoặc N+1, hoặc `LazyInitializationException`. `JpaPostAccess` dựng thẳng record:

```
1. posts đã lọc quyền + phân trang                        1 query
2. user.api.UserAccess.findAllById(authorIds)             1 query
3. spot.api.SpotAccess.findAllById(spotIds)               1 query
4. media WHERE post_id IN (...)                           1 query
```

Bốn query cố định, không phụ thuộc kích cỡ trang. Không có lazy association nào để trigger, nên không có N+1 nào ẩn được vào thiết kế này.

### Thay đổi với code đang có

- `findVisibleTo(viewerId)` trả `List<Post>` **bị xoá**. Không API nào trong `api/` trả collection không phân trang.
- `PostVisibilityRules` xuống `post.repository`, thành package-private. Nó là chi tiết cài đặt, không phải hợp đồng.
- `shared/BaseEntity` giữ nguyên. `equals`/`hashCode` viết tay ở đó đang đúng.
- `PostVisibilityRulesTest` giữ nguyên toàn bộ ca kiểm, đổi sang gọi bản `Slice`.

---

## 7. Coupling `post` → `user`

`PostVisibilityRules` đang subquery vào `follows`, `close_friends`, `blocks` — ba bảng của module `user`. Feed còn cần tên và avatar tác giả. Nhìn giống nhau, nhưng là hai bài toán khác nhau.

### Lọc — không bỏ được khỏi SQL

"Ai được xem bài nào" phải nằm trong `WHERE`. Lọc trong bộ nhớ nghĩa là nạp bài không được phép xem lên RAM rồi mới bỏ, và trang 20 bài sẽ không bao giờ đủ 20.

`user` công bố mảnh criteria qua một named interface **riêng, tên `query`**:

```java
// user/query/package-info.java
@org.springframework.modulith.NamedInterface("query")
package com.vinhung.nookaapi.user.query;
```

```java
// user/query/RelationshipCriteria.java
public interface RelationshipCriteria {
    Subquery<Integer> followExists(CriteriaQuery<?> q, CriteriaBuilder cb,
                                   UUID viewerId, Path<UUID> authorId);
    Subquery<Integer> closeFriendOf(CriteriaQuery<?> q, CriteriaBuilder cb,
                                    UUID viewerId, Path<UUID> ownerId);
    Subquery<Integer> blockBetween(CriteriaQuery<?> q, CriteriaBuilder cb,
                                   UUID viewerId, Path<UUID> otherId);
}
```

`user` nhận vào một `Path<UUID>` và không biết `Post` tồn tại. `post` ghép ba mảnh vào Specification của mình. Một câu SQL, ranh giới còn nguyên.

**Vì sao tách khỏi `user :: api`.** Đây là hợp đồng kỹ thuật, không phải hợp đồng nghiệp vụ — nó lộ kiểu `jakarta.persistence.criteria`, thứ `api/` cấm. Để chung sẽ khiến `api/` mất nghĩa và mở đường cho JPA rò tiếp. Tách ra thì vết bẩn nằm trong một package có tên riêng, có lý do viết rõ, và module nào xin dùng phải khai `user :: query` trong `allowedDependencies` — tức là cố ý, không vô tình.

Đánh đổi đã cân nhắc và chấp nhận: lựa chọn còn lại là `post` tự map lại ba bảng của `user`, tức hai chỗ cùng biết một schema. Đó đúng là thứ comment trong `PostVisibilityRules` đang cảnh báo — *"hai bản sao sẽ lệch nhau, và bản lệch sẽ là bản để lộ dữ liệu."*

### Làm giàu — bỏ được, và bỏ

Tên tác giả, avatar, tên spot không phải điều kiện lọc, chỉ là dữ liệu hiển thị. Không join xuyên module; tra theo lô qua `user :: api` và `spot :: api` như §6.

---

## 8. Event xuyên module

```
post.service.PostCommandService
   └─ lưu post + publish PostCreated            ← một transaction
        ├─ spot         @ApplicationModuleListener → bật Been (§8)
        └─ notification @ApplicationModuleListener → row + push (§9)
```

`post` không import `spot`, không import `notification`.

### Đây là eventual consistency, không phải atomic

`@ApplicationModuleListener` là meta-annotation gộp `@Async` + `@Transactional(REQUIRES_NEW)` + `@TransactionalEventListener`. Nghĩa là listener chạy **bất đồng bộ, trong transaction mới, sau khi transaction tạo post đã commit**.

Hệ quả phải viết vào tài liệu vì nó thay đổi cách viết code:

- **Có một khoảng thời gian bài đăng đã tồn tại nhưng `Been` chưa bật.** API đọc `Been` phải chịu được điều đó. Không viết test kiểu "tạo post xong đọc Been ngay".
- **Listener phải idempotent.** Cùng một event có thể được xử lý lại sau khi resubmit. `Been` có khoá chính `(user_id, spot_id)` nên `ON CONFLICT DO NOTHING` là đủ.
- **Chống trùng nằm ở database, không nằm ở FCM.** Registry bảo đảm *at-least-once*, không phải *exactly-once*. Cơ chế chống trùng là một unique constraint `(event_id, recipient_id)` trên bảng `notifications` — mỗi event sinh đúng một dòng cho mỗi người nhận, dù listener chạy lại bao nhiêu lần.
- **Push payload mang theo `eventId`**, để client bỏ qua thông báo đã hiển thị.

  **FCM không có idempotency key.** Nó có `collapse_key`, nhưng thứ đó chỉ thay thế một message *đang chờ giao* bằng message mới hơn — dùng cho loại thông báo mà bản mới đè bản cũ, không phải cơ chế chống trùng tổng quát. Đừng dựa vào nó để bảo đảm gửi một lần.

### Đường sống sót của event

Modulith ghi publication vào bảng `event_publication` **trong transaction gốc**, và chỉ đánh dấu completed sau khi listener chạy xong. Listener chết thì dòng đó nằm lại ở trạng thái chưa hoàn thành.

**Phát lại lúc restart không tự động.** Nó là `spring.modulith.events.republish-outstanding-events-on-restart`, mặc định tắt. Chỉ bật khi chiến lược deploy cho phép, và cần cân nhắc kỹ khi chạy nhiều instance — hai instance cùng khởi động sẽ cùng phát lại. Ở giai đoạn một instance trên Railway/Fly.io thì bật được; chốt lại khi scale.

### Registry dùng `starter-jdbc`, không phải `-jpa`

`spring-modulith-events-jpa` mang theo `@Entity` gắn `@Table("EVENT_PUBLICATION")`, trong đó `serializedEvent` là `String` không khai `length` — Hibernate suy ra `varchar(255)`, còn schema chính thức là `TEXT`. Dưới `ddl-auto: validate` đó là ma sát không cần có, và 255 ký tự quá ngắn cho event serialize ra JSON.

`spring-modulith-events-jdbc` không có entity nào, nên Hibernate không nhìn thấy bảng này. Flyway sở hữu nó, lấy nguyên văn từ `schemas/v2/schema-postgresql.sql` trong jar 2.1.0:

```sql
CREATE TABLE IF NOT EXISTS event_publication (
  id                     UUID NOT NULL,
  listener_id            TEXT NOT NULL,
  event_type             TEXT NOT NULL,
  serialized_event       TEXT NOT NULL,
  publication_date       TIMESTAMP WITH TIME ZONE NOT NULL,
  completion_date        TIMESTAMP WITH TIME ZONE,
  status                 TEXT,
  completion_attempts    INT,
  last_resubmission_date TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS event_publication_serialized_event_hash_idx
    ON event_publication USING hash(serialized_event);
CREATE INDEX IF NOT EXISTS event_publication_by_completion_date_idx
    ON event_publication (completion_date);
```

### Bắt buộc tắt schema initialization tường minh

```yaml
spring:
  modulith:
    events:
      jdbc:
        schema-initialization:
          enabled: false
```

**Dòng này không thừa, và đừng tin `@DefaultValue`.** Modulith 2.1.0 tự mâu thuẫn ở chỗ này:

```java
// JdbcConfigurationProperties.java:91
SchemaInitialization(@DefaultValue("false") boolean enabled)

// JdbcEventPublicationAutoConfiguration.java:101 — dòng thật sự quyết định
@ConditionalOnProperty(
    name = "spring.modulith.events.jdbc.schema-initialization.enabled",
    havingValue = "true",
    matchIfMissing = true)
static class JdbcEventPublicationSchemaCreationAutoConfiguration { ... }
```

Bean `DatabaseSchemaInitializer` được gác bằng `@ConditionalOnProperty`, không bằng giá trị đọc từ properties class. `matchIfMissing = true` nghĩa là **vắng cấu hình thì initializer vẫn chạy**.

Nó không làm app chết — schema dùng `CREATE TABLE IF NOT EXISTS`, và autoconfig khai `@AutoConfiguration(afterName = FlywayAutoConfiguration)` nên Flyway chạy trước rồi initializer no-op. Vấn đề là **hai chủ sở hữu cho một bảng**, đúng thứ quy ước Flyway của dự án sinh ra để loại bỏ.

### Dọn bảng — chốt `completion-mode`

```yaml
spring:
  modulith:
    events:
      completion-mode: delete
```

Mặc định là `UPDATE` (`CompletionMode.java:47-50`): event xử lý xong vẫn nằm lại trong bảng, chỉ được set `completion_date`. Không có tác vụ dọn thì `event_publication` phình vô hạn — mỗi bài đăng sinh ít nhất hai dòng vĩnh viễn.

`DELETE` xoá dòng khi listener chạy xong. Event thất bại hoặc chưa hoàn tất **vẫn nằm lại** để còn retry — chỉ dòng đã hoàn thành mới biến mất.

Đánh đổi: mất dấu vết "event này đã giao lúc nào". Nếu sau này cần audit thì đổi sang `UPDATE` hoặc `ARCHIVE`, và **khi đó bắt buộc kèm một scheduled purge** — đổi mode mà quên purge là quay lại đúng vấn đề trên. Không để quyết định này ngầm định.

### Khi nâng version Modulith

So lại ba thứ trước khi tin rằng cấu hình cũ vẫn đúng: file `schemas/v*/schema-postgresql.sql`, `@ConditionalOnProperty` của autoconfig schema initialization, và default của `CompletionMode`.

---

## 9. Auth

```
platform/security/       filter, principal, argument resolver
user/spi/TokenVerifier   port
platform/firebase/FirebaseTokenVerifier   adapter
```

Luồng: filter đọc `Authorization: Bearer`, `TokenVerifier` verify và trả `firebaseUid`, `platform.security` đổi sang `UUID` nội bộ qua `user :: api`, đặt vào `SecurityContext`.

Từ đó xuống dưới, **`viewerId` là tham số tường minh**. Không ThreadLocal, không `SecurityContextHolder` ở tầng service hay repository.

Lý do không phải sở thích: `viewerId` lấy ngầm sẽ null trong luồng async, trong `@Scheduled`, trong listener của §8 — và null ở đây nghĩa là "khách chưa đăng nhập", tức là **kết quả sai vẫn trả về 200**, không phải exception. Tham số nằm trong chữ ký hàm thì trình biên dịch bắt phải điền, và code review nhìn thấy nó.

Kiểu `@Nullable UUID viewerId`: null hợp lệ và có nghĩa là chưa đăng nhập. Endpoint bắt buộc đăng nhập chặn ở tầng security, không chặn bằng cách kiểm null ở dưới.

---

## 10. Lỗi

Một `@RestControllerAdvice` duy nhất, trả `ProblemDetail` theo RFC 9457. Exception nghiệp vụ khai ở `<module>/exception/`, map tập trung.

Giữ nguyên quyết định đã có trong code: **bài không tồn tại và bài cấm xem đều trả 404.** Phân biệt được hai cái tức là để lộ sự tồn tại của bài riêng tư. `PostAccess.detail` trả `Optional.empty()` cho cả hai trường hợp và không cho phía trên biết là trường hợp nào.

Không trả stack trace, không trả tên class, không trả tên bảng.

---

## 11. Test

| Test | Chặn gì |
|---|---|
| `ModularityTest` | `ApplicationModules.of(NookaApiApplication.class).verify()` — module import chéo |
| `ArchitectureTest` | `controller` ✗→ `entity`, `repository`; ngoài `post.repository` ✗→ `PostRepository` (theo FQCN) |
| `PostVisibilityRulesTest` | Đã có. Giữ toàn bộ ca kiểm, đổi sang gọi bản `Slice` |
| `@ApplicationModuleTest` | Test một module không bootstrap cả app |

Testcontainers Postgres thật, không H2 — giữ nguyên quyết định đang có, vì Flyway migration viết cho Postgres và khác biệt dialect sẽ khiến test xanh trong khi production đỏ.

`PostVisibilityRulesTest` là test quan trọng nhất trong dự án và §20 nói nó phải được viết trước code. Nó đã tồn tại và đang xanh — đừng làm hỏng nó khi tái cấu trúc.

---

## 12. Schema và migration

### Kiểm kê

`V1__baseline.sql` tạo **18 bảng**. **10 bảng có entity**: `cities`, `areas`, `users`, `follows`, `close_friends`, `blocks`, `spots`, `places`, `experiences`, `posts`.

**8 bảng mồ côi**, không có entity và không có code đọc/ghi: `post_media`, `post_vibe_tags`, `reactions`, `comments`, `want_to_go`, `been`, `reports`, `notifications`.

### Chia lại V1 — cửa sổ chỉ mở một lần

`V1__baseline.sql` **đã được commit** (trong `init repo`) — câu "đang untracked" ở bản 2026-07-28 nay đã sai. Nhưng nó vẫn **chưa chạy ở môi trường nào ngoài máy dev**, và đó mới là điều kiện thật sự khiến việc chia lại còn miễn phí: quy ước "không sửa migration đã chạy" nói về database dùng chung, không nói về git. Cửa sổ đóng lại vào lần đầu migration chạy trên staging hoặc production, không phải vào lúc commit.

```
V1__user.sql                 users, follows, close_friends, blocks
V2__spot.sql                 cities, areas, spots, places, experiences
V3__post.sql                 posts, post_media, post_vibe_tags
V4__event_publication.sql    Modulith registry, nguyên văn từ jar 2.1.0
```

### Tiêu chí giữ hay hoãn

Không phải "chưa có entity thì loại" — nếu vậy thì `post_media` và `post_vibe_tags` trong `V3` cũng phải loại, và spec này tự bác bỏ chính nó. Tiêu chí đúng là:

> **Bảng ở lại baseline khi nó có entity và code trong cùng implementation plan này. Bảng phải chờ một plan khác thì hoãn.**

Áp vào 8 bảng mồ côi:

| Bảng | Quyết định | Lý do |
|---|---|---|
| `post_media` | **Giữ**, `V3` | §10 khoá `≥ 1 photo` là bắt buộc khi đăng — không có nó thì không đăng được bài, tức là vertical slice không chạy |
| `post_vibe_tags` | **Giữ**, `V3` | §10 liệt vibe tags trong phần optional của luồng Create; §12 gọi metadata có cấu trúc là moat số 2 |
| `reactions` | Hoãn | Không nằm trong vòng lặp §10 |
| `comments` | Hoãn | Màn hình Place detail có, nhưng không cần để đóng vòng lặp |
| `want_to_go` | Hoãn | Thuộc module `spot`, plan riêng |
| `been` | Hoãn | Thuộc module `spot`, plan riêng |
| `reports` | Hoãn | Thuộc module `moderation`, plan riêng |
| `notifications` | Hoãn | Thuộc module `notification`, plan riêng — và cần thêm unique `(event_id, recipient_id)` ở §8 |

Sáu bảng hoãn **rời khỏi baseline**, quay lại trong migration của module tương ứng. SQL đã viết rồi, chỉ chuyển file — không mất gì.

Lý do không phải sạch sẽ hình thức: bảng không có code và không sắp có code là bảng chưa ai kiểm chứng. `ddl-auto: validate` không soi nó, không test nào chạm nó, và giữ nó trong baseline tạo cảm giác phần đó đã xong.

Giữ nguyên một quy ước đang có và nó vẫn đúng: **Flyway sở hữu schema, `ddl-auto` mãi là `validate`.** Sau khi V1 được commit, không sửa migration đã chạy.

---

## 13. Dependency thêm vào `pom.xml`

```xml
<dependencyManagement>
  <dependency>
    <groupId>org.springframework.modulith</groupId>
    <artifactId>spring-modulith-bom</artifactId>
    <version>2.1.0</version>
    <type>pom</type>
    <scope>import</scope>
  </dependency>
</dependencyManagement>

<!-- runtime — chỉ một starter. -->
spring-modulith-starter-jdbc

<!-- test -->
spring-modulith-starter-test
com.tngtech.archunit:archunit-junit5:1.4.2
```

**Không khai `spring-modulith-starter-core` riêng.** POM của `starter-jdbc 2.1.0` đã kéo nó ở scope `compile`, cùng với `events-api`, `events-core`, `events-jackson`, `events-jdbc`. Khai thêm là dư và tạo ấn tượng sai rằng hai thứ độc lập với nhau.

Đã xác minh: `spring-modulith-core 2.1.0` compile trên `spring-boot-autoconfigure 4.1.0` và `spring-core 7.0.8` — khớp đúng version dự án đang chạy.

`spring-modulith-core` kéo sẵn `archunit 1.4.2`, đủ cho `ApplicationModules.verify()`. Nhưng §6 và §11 dùng `@AnalyzeClasses` và `@ArchTest`, hai thứ nằm ở artifact `archunit-junit5`, nên phải khai thêm nó ở scope test.

**Version của nó phải ghi tường minh.** Đã kiểm: cả `spring-boot-dependencies 4.1.0` lẫn `spring-modulith-bom 2.1.0` đều không quản `com.tngtech.archunit` — BOM của Modulith chỉ quản `org.springframework.modulith`. Khai thiếu version thì Maven báo lỗi ngay. Ghim `1.4.2` để khớp đúng bản `archunit` mà Modulith kéo vào, tránh hai bản ArchUnit lệch nhau trên classpath test.

Khi nâng Modulith, kiểm lại `archunit` transitively rồi chỉnh con số này theo.

### springdoc — đã mở khoá, chưa kiểm chứng

`README.md` của `nooka-api` ghi springdoc bị chặn vì chưa có bản cho Boot 4. **Dòng đó đã lỗi thời và cần sửa.** `springdoc-openapi` bản ổn định hiện tại là **3.0.3**, và nhánh 3.x nhắm Spring Boot 4.

Nhưng chưa phải "cứ thêm là xong": POM của `springdoc-openapi 3.0.3` có parent là `spring-boot-starter-parent` **4.0.5**, còn dự án chạy **4.1.0**. Khác minor version, nhiều khả năng chạy được, nhưng chưa ai kiểm.

Nên: việc sinh `openapi.json` xuất sang `nooka-docs/contracts/` **không còn bị chặn về mặt công cụ**, và implementation plan đưa nó vào như một bước có smoke test riêng — thêm dependency, khởi động app, gọi `/v3/api-docs`, xác nhận có JSON hợp lệ — chứ không giả định là chạy.

---

## 14. Chưa chốt

Những thứ cố ý để ngỏ, cần quyết trước khi làm phần liên quan:

- **Khử trùng push của FCM.** Chốt khi xây module `notification`.
- **Bật `republish-outstanding-events-on-restart` hay không.** Phụ thuộc chiến lược deploy; chốt khi có môi trường thật, và xem lại khi chạy nhiều hơn một instance.
- **Ngưỡng khoảng cách chống trùng place.** §7 nói cần cơ chế, chưa nói bán kính bao nhiêu mét. Thuộc module `spot`.
- **Có tách module `social`** cho `follows`/`close_friends`/`blocks` hay không. MVP giữ trong `user` (D13). Xem lại nếu `user` phình.
- **Chiến lược migrate khi Modulith lên version mới.** Nguyên tắc đã ghi ở §8: so lại file schema trước khi nâng.
