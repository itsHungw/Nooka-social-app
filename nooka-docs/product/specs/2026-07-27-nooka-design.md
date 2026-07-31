# Nooka — Product Design Spec

| | |
|---|---|
| **Codename** | Nooka *(tạm thời — chờ bài test 5 người + tra nhãn hiệu)* |
| **Ngày** | 2026-07-27 |
| **Trạng thái** | Concept đã khóa, chờ review trước khi lập kế hoạch triển khai |
| **Bối cảnh** | Pet project làm chuẩn, để ngỏ khả năng thành startup nhỏ |
| **Thị trường đầu** | TP.HCM |
| **Ngôn ngữ UI** | Tiếng Anh là locale gốc; i18n từ ngày đầu; tiếng Việt thêm sau |
| **Tài liệu thay thế** | BA/SRS v0.1 (tên cũ: ĐiĐâu / Spoto) — tài liệu này ưu tiên cao hơn khi có xung đột |

---

## 1. Sản phẩm là gì

Nooka là một **mạng xã hội hình ảnh về những nơi người ta thật sự đã đi**, ở thành phố mình đang sống.

Bình thường user mở app để xem và lướt như một mạng xã hội thông thường. Khi user có một nhu cầu cụ thể — hẹn hò tối nay, tìm chỗ học bài, đi nhóm sáu người — chính khối nội dung xã hội đó được lọc và xếp lại thành một feed gợi ý phù hợp.

Một câu:

> **Scroll for inspiration. Search with intention.**

### Không phải là gì

Không phải Google Maps thay thế. Không phải app chỉ đường. Không phải nền tảng review doanh nghiệp. Không phải mạng xã hội ảnh tổng quát. Không phải chatbot tìm địa điểm. Không phải app du lịch — Nooka nói về **đi gần**, không phải đi xa.

### Vòng lặp cốt lõi

```
Someone goes somewhere
  → Posts it in a few taps
  → People see it while scrolling
  → Want to go
  → Someone actually visits
  → Their post enters the feed
```

---

## 2. Quyết định đã khóa

1. Visual-first. Ảnh là nội dung chính; chữ chỉ xuất hiện khi user chủ động mở.
2. **Mọi bài đăng phải gắn với một địa điểm thật.** Không có social post tự do.
3. Social graph là **follow một chiều**; mutual follow được đối xử như quan hệ bạn bè. Close Friends là danh sách riêng tư một chiều để kiểm soát nội dung nhạy cảm.
4. Feed là **vertical scroll**. Tinder-style swipe không có trong bản đầu; có thể thử sau trong một mode riêng.
5. Hai chế độ sử dụng, **một loại card duy nhất** — chỉ khác đơn vị xếp hạng.
6. Search là hybrid: universal search cho truy vấn rõ + `Ask Nooka` cho nhu cầu mơ hồ.
7. Đơn vị xếp hạng khác nhau theo bề mặt: Home là post-first, Intent/Search là place-first.
8. Hierarchy dữ liệu: `City → Area → Place → Post`. Topic **không** sở hữu dữ liệu, nó chỉ là một lăng kính lọc.
9. AI tổ chức và lọc nội dung người thật. AI **không** được tạo review, tạo giá, hay tạo việc user đã đến.
10. Không theo dõi vị trí thời gian thực. Không bao giờ.
11. User kiểm soát audience của từng bài đăng.
12. MVP tập trung TP.HCM, và trong TP.HCM còn thu hẹp thêm (xem §11).
13. Place là engine giữ chân. Experience là engine doanh thu.

---

## 3. Mô hình social

Định vị: **friend-first, không friend-only.** Bạn bè là lớp tin cậy đầu tiên, không phải giới hạn nội dung.

```
Follow (một chiều)     → thấy bài của người đó
Mutual follow          → được đối xử như bạn bè
Close Friends          → danh sách một chiều, riêng tư, không thông báo cho người được thêm
Block                  → chặn mọi tương tác hai chiều
```

Không có friend request hai chiều. Lý do: cơ chế đó tạo cold start rất nặng và giới hạn Nooka thành một group chat có hình ảnh.

Mỗi bài đăng phải cho user biết **vì sao mình thấy nó**:

```
Spotted by Minh · you follow each other
3 people you follow have been here
Popular with people who like quiet cafés
New around Bình Thạnh this week
```

### Điều Nooka không sao chép từ mạng xã hội thường

- Không lấy số follower làm tín hiệu nổi bật.
- Không lấy Like làm hành động chính.
- Không biến mọi người thành creator.
- Không để ảnh đẹp thắng trải nghiệm hữu ích.

Hành động được ưu tiên: `Want to go`, `Been`, `Ask`, `Invite`.

---

## 4. Hai chế độ sử dụng

### Social Mode — mở app khi chưa có nhu cầu gì

```
Open app
  → Scroll posts from people you follow + community
  → React / Comment / Want to go / Share
  → Follow people with similar taste
```

Xếp hạng theo: người + độ mới.

Nguồn nội dung, theo thứ tự ưu tiên:
1. Người user follow, hoặc follow lẫn nhau
2. Người cùng gu, cùng khu vực, cùng kiểu trải nghiệm
3. Nội dung public chất lượng từ cộng đồng
4. Nội dung mới quanh khu vực (không phải vị trí real-time)

### Intent Mode — mở app khi có nhu cầu cụ thể

```
User states a need
  → AI extracts occasion, party size, budget, area, time, vibe
  → At most ONE clarifying question
  → Editable filter chips
  → Visual selection, one card per place
  → Want to go / open detail
```

Xếp hạng theo: mức độ phù hợp với nhu cầu.

Ví dụ:

```
Input:   "date for two tonight, under 500K, easy to talk, D1–D3"

Parsed:  occasion   first date
         party      2
         budget     < 500,000₫
         area       District 1–3
         time       tonight
         vibe       quiet, easy to talk

Chips:   [D1–D3] [Quiet] [Indoor] [Under 500K]
```

AI **không** trả về đoạn văn. Output luôn là feed hình ảnh.

---

## 5. Hệ thống card

Một loại card duy nhất cho cả hai chế độ. Điều này quan trọng: hai giao diện khác nhau sẽ khiến user cảm thấy đang dùng hai app.

**Tầng 1 — Glance** (hiểu trong 1–2 giây, không cần đọc):

```
┌─────────────────────────────┐
│                             │
│      [ photo / video ]      │
│                             │
│  The Workshop Coffee        │
│  District 1 · Quiet · Date  │
│                             │
│  Spotted by Linh            │
│  You follow each other      │
│                             │
│  [♡]  [Want to go]  [↗]     │
└─────────────────────────────┘
```

Trong Intent Mode, thêm một dòng lý do phù hợp:

```
Matches: quiet, under 500K, 2 friends have been
```

**Tầng 2 — Quick context** (một thao tác): tags, occasion, khoảng giá, một điều cần biết, những người đã đi.

**Tầng 3 — Decision detail** (chỉ khi user thật sự cân nhắc): các bài đăng khác của place, insight tổng hợp, comment và reaction, ý kiến trái chiều, bản đồ, hỏi người đăng, rủ bạn.

Nguyên tắc: **Nhìn trước. Thích rồi mới đọc.**

---

## 6. Search

Một search bar, hai hệ thống.

```
┌────────────────────────────────────────┐
│ Search places, people, posts…    [✨]  │
└────────────────────────────────────────┘
```

### 6.1 Universal search — user biết mình tìm gì

Hoạt động như search của mạng xã hội, tab kết quả:

```
[Top]  [Places]  [People]  [Posts]  [Topics]
```

| Query | Kết quả ưu tiên |
|---|---|
| `The Workshop` | Place |
| `@linh` | People |
| `matcha district 1` | Places + Posts |
| `first date` | Topics + Places |

### 6.2 Ask Nooka — user chưa biết nên đi đâu

CTA phải có chữ, không chỉ icon: `✨ Ask Nooka`. Icon trơn thì user mới không hiểu nó làm gì.

Khi user nhập một query phức tạp vào universal search, hệ thống **gợi ý** chuyển sang AI nhưng không tự chuyển:

```
✨ Looks like you're exploring. Build a selection with Ask Nooka?
   ── kết quả search thường vẫn hiển thị bên dưới ──
```

Không tự chuyển, vì user có thể chỉ đang muốn tìm một bài đăng có chứa câu đó.

### 6.3 Selection ≠ Topic

Mỗi lần user hỏi AI **không** tạo ra một Topic public. Nếu không, hệ thống sẽ có hàng nghìn topic gần trùng nhau.

```
AI query                  → Selection      (tạm thời, riêng một user)
User lưu / chia sẻ        → Saved Selection / Shared Selection
Nhiều người cùng nhu cầu  → có thể nâng thành Topic
```

Topic ở bản đầu chỉ là **discovery lens** do hệ thống tạo hoặc biên tập. Việc user tự tạo, quản lý, mời đóng góp và merge topic để giai đoạn sau.

> **Thuật ngữ:** tài liệu này dùng **Topic** cho khái niệm này. "Lens" chỉ là cách mô tả vai trò của nó (một lăng kính lọc), không phải một object thứ hai.

---

## 7. Kiến trúc dữ liệu khái niệm

```
City
└── Area
    ├── Place        ← café, quán ăn, bar, không gian cố định
    │   └── Post
    │       ├── Media
    │       ├── Vibe tags
    │       ├── Price
    │       ├── Occasion
    │       ├── Author
    │       └── Comments / Reactions
    │
    └── Experience   ← workshop, tour, lớp học, sự kiện; có giá vé
        └── Post     (cùng cấu trúc Post)

Topic / Selection  ──lọc──▶  nhiều Place và Experience
                             + chọn Post làm bằng chứng hình ảnh
```

### Place đến từ đâu — đã chốt

**User-created + seed thủ công. Không dùng Google Places API làm nguồn dữ liệu gốc.**

Lý do: điều khoản của Google cấm xây dựng và lưu trữ database địa điểm riêng từ dữ liệu của họ, tức là nó phá đúng moat ở §12; §11 vốn đã yêu cầu seed 300–500 place bằng tay; và ở quy mô ba quận thì làm tay khả thi.

OpenStreetMap có thể dùng để đối chiếu tọa độ. Google Places autocomplete chỉ được thêm sau, như tiện ích tìm kiếm, không phải nguồn lưu trữ.

Hệ quả: cần cơ chế **chống trùng place** ngay từ đầu (so tên + tọa độ trong bán kính, gợi ý merge), vì user tạo place tự do sẽ sinh ra bản trùng.

---

**Place và Experience là hai loại `Spot` ngang hàng**, cùng nhận Post, cùng nhận `Want to go` và `Been`, cùng xuất hiện trong feed dưới một loại card. Khác nhau ở chỗ Experience có giá vé và có thể gắn với nhiều địa điểm hoặc không có địa điểm cố định.

Bản đầu **chưa có booking**, nhưng Experience phải tồn tại như một object riêng ngay từ schema đầu tiên — xem §12. Nếu nhét Experience vào chung bảng Place thì khi thêm booking sẽ phải migrate lại toàn bộ.

### Interaction bind vào đâu

Đây là chỗ dễ làm rối dữ liệu nhất, nên khóa rõ:

| Hành động | Gắn vào |
|---|---|
| React | Post |
| Comment | Post |
| Follow | User |
| **Want to go** | **Place** |
| **Been** | **Place** |
| Ask | Post (giữ context) |
| Invite | Place |

> User thích một *bài đăng*, nhưng thứ họ muốn đi và lưu là một *địa điểm*.

---

## 8. Trạng thái địa điểm — quyết định đã chốt

Tài liệu SRS cũ có cả `Save` và `Want to Go` trỏ vào cùng một danh sách, gây trùng lặp. Bản đầu **gộp còn hai trạng thái**:

| Trạng thái | UI string | Cách bật |
|---|---|---|
| Ý định đi | `Want to go` | User bấm |
| Đã đi | `Been` | Tự động bật khi user đăng bài tại place đó |

`Saved`, danh sách tùy chỉnh, và ghi chú riêng để giai đoạn sau — chỉ thêm khi có user thật đòi. Hai nút thì không ai phải hỏi chúng khác nhau ở đâu.

*Ghi chú i18n:* khi thêm locale tiếng Việt, ba trạng thái có thể dùng chung một gốc từ và trở nên gọn hơn bản tiếng Anh: `Ghé sau` / `Sẽ ghé` / `Đã ghé`.

---

## 9. Động lực đăng bài — rủi ro số một

Feed cần nội dung. Nội dung cần người đăng. Nhưng người lướt không phải người đăng.

Instagram và TikTok sống được với ~1% người đăng vì họ có creator economy và thuật toán toàn cầu. Nooka **không thể**, vì nội dung phải local, mới, và phủ dày ở từng quận. Một quận không có nội dung mới đều đặn thì Intent Mode trả kết quả rỗng.

Bốn động cơ, xếp theo sức mạnh:

| Động cơ | Cơ chế | Đánh giá |
|---|---|---|
| Lưu cho chính mình | **My Nooka Map** — bản đồ nơi đã đi, tự đẹp dần | Mạnh nhất, không cần khán giả |
| Thể hiện gu | Profile nhìn phát biết người này hay đi đâu | Mạnh |
| Cảm giác hữu ích | "3 people want to go after your post" | Trung bình, giữ chân contributor |
| Like / follower | Đếm số | Yếu và nguy hiểm — kéo về phía Instagram |

**Quyết định:** dựng động cơ số 1 làm mặc định. User đăng vì muốn có bản đồ riêng của mình; việc người khác thấy chỉ là hệ quả.

**Cảnh báo Locket:** thứ khiến Locket viral là widget + vòng tròn 5 người, không phải feed. Cơ chế đó không mở rộng thành mạng discovery. Học sự *nhẹ* của Locket (đăng trong 2 chạm), không copy *cấu trúc*.

---

## 10. Vertical slice — phạm vi bản đầu tiên

Bản nhỏ nhất phải chứng minh được vòng lặp này:

```
A posts a place with a photo
  → B sees it
  → B taps Want to go
  → B goes there
  → B posts
  → the two posts are linked
  → A learns their recommendation caused a visit
```

### Màn hình

| Màn hình | Nội dung |
|---|---|
| **Home** | Vertical feed, một loại card |
| **Create** | Đăng một place trong ≤ 4 thao tác |
| **Search** | Universal search + `Ask Nooka` |
| **Saved** | Want to go / Been |
| **Profile** | My Nooka Map + lịch sử bài đăng |
| **Place detail** | Media cộng đồng, insight, comment, hỏi người đăng |

### Capability nghiệp vụ bắt buộc

Account · Follow / Close Friends · Post gắn Place · Feed · Place page · Want to go · Been · Follow-up link · Privacy per post · Notification cơ bản · Report và Block.

### Bắt buộc khi đăng

```
Required   ≥ 1 photo
           Place
           Visibility
Optional   Price, occasion, vibe tags, one thing to know,
           caption, party size, would return
```

### Ngoài phạm vi bản đầu

Inbox đầy đủ và message request · Invite với RSVP nhiều người · User tự tạo và quản lý Topic · Recap cá nhân · Insight tổng hợp phức tạp · Video · Swipe mode · Public creator profile · Business actor · Booking · Thanh toán · Chỉ đường · Tìm trọ · Marketplace.

**Hỏi người đăng** ở bản đầu chỉ là một câu hỏi công khai dưới bài, không phải chat riêng. Chat 1-1 chỉ làm khi có bằng chứng người ta thật sự cần.

---

## 11. Cold start — đừng launch cả TP.HCM

"MVP tập trung TP.HCM" nghe hẹp nhưng vẫn quá rộng: hơn 9 triệu dân, hơn 20 quận. User ở Thủ Đức mở app thấy toàn nội dung Quận 1 sẽ rời đi.

**Quy tắc mật độ:** một user mới phải thấy **ít nhất 20 place thật trong bán kính quen thuộc ngay ngày đầu**. Chưa đạt thì chưa mở thêm khu vực.

```
Khu vực khởi điểm    Quận 1 + Quận 3 + Bình Thạnh
Nhóm người           Sinh viên và người đi làm 1–2 năm đầu
Điểm tựa             2–3 cụm trường đại học
```

### Chia vai hai vertical

| Vertical | Vai | Lý do |
|---|---|---|
| **Café học / làm việc** | Nguồn cung nội dung | Ngồi 3 tiếng, cầm điện thoại, đăng dễ, tần suất hàng tuần |
| **Hẹn hò** | Nguồn cầu | Nhu cầu gấp, cảm xúc mạnh, dễ marketing — nhưng ít ai đăng công khai chỗ đi date |

Không chọn dating làm beachhead cho cả supply lẫn demand: đăng chỗ hẹn hò là hành vi riêng tư, nội dung sẽ không đủ.

### Seeding trước khi mở

- Một nhóm nhỏ đi thật và đăng 300–500 bài chất lượng.
- Mời micro-reviewer đang đăng nội dung này trên Threads/TikTok mang kho ảnh cũ sang.
- Đi theo cụm: một quận cho tới khi dày, rồi mới mở quận tiếp.

---

## 12. Lộ trình business

Bài học Việt Nam cần nhìn thẳng: Foody và Lozi đều khởi đầu là discovery/review và **cả hai đều không monetize được lớp discovery**. Foody về tay Sea rồi thành ShopeeFood; Lozi thành Loship rồi không trụ nổi. Cả hai bị hút về giao hàng vì đó là chỗ có giao dịch.

Nooka **không** đi vào delivery. Chỗ có giao dịch mà chưa ai chiếm là **Experience**.

| | Place (café, quán ăn) | Experience (workshop, tour, lớp, sự kiện) |
|---|---|---|
| Giá vé | Không có | 150K–800K, có thật |
| Kênh phân phối | Bão hòa | Yếu, chủ yếu Facebook page |
| Ăn hoa hồng | Gần 0 | 10–20% khả thi |
| Tần suất đăng | Cao | Thấp |

Vì vậy: **Place giữ chân, Experience sinh tiền.** Experience phải là first-class object trong mô hình dữ liệu ngay từ đầu, dù chưa có booking — nếu không, sau này phải làm lại.

### Bốn giai đoạn

```
0   0–6 tháng     Không doanh thu.
                  Mục tiêu duy nhất: mật độ nội dung ở 2–3 quận.

1   6–12 tháng    Nooka for Business — MIỄN PHÍ.
                  Quán claim trang, xem ai đang muốn đến, giờ nào đông,
                  khách nói gì. Mục tiêu: 200 quán claim, không thu tiền.
                  Đây là bước xây quan hệ, không phải bước bán.

2   12–18 tháng   Bắt đầu bán: sponsored visit campaign CÓ NHÃN,
                  promoted place trong Topic, sponsor cho Topic theo dịp.

3   18 tháng+     Experience booking, ăn hoa hồng.
                  Insight tổng hợp cho brand.
```

Điểm quan trọng ở giai đoạn 1: **cho không có chủ đích.** Dashboard miễn phí là cách rẻ nhất để có 200 mối quan hệ với chủ quán trước khi cần bán bất cứ thứ gì, và nó làm sạch dữ liệu địa điểm giúp bạn.

### Nguồn doanh thu bị loại

Người dùng trả phí (ARPU quá thấp ở VN, và tính phí sẽ giết network effect ở giai đoạn cần mật độ) · Delivery (biên lợi nhuận đã chết) · Deal/voucher kiểu Groupon (kéo khách săn giảm giá, retention xấu cho quán).

### Moat thật sự

Không phải feed, không phải AI. Ba thứ:

1. **Taste graph** — ai hợp gu ai.
2. **Metadata có cấu trúc từ lần đi thật** — có ổ cắm không, giờ nào ồn, hai người hết bao nhiêu, hợp dịp gì. Google Maps review dạng văn xuôi không trích xuất được ở quy mô.
3. **Mật độ local** — thứ khiến người thứ 1000 ở lại.

Số 2 là lý do bài đăng phải có tag và chip, không chỉ có ảnh. Đây là lập luận chống lại việc đơn giản hóa post xuống chỉ còn ảnh.

---

## 13. Privacy

| Level | Ai xem được |
|---|---|
| `Public` | Mọi người, xuất hiện trong discovery |
| `Followers` | Người follow |
| `Close Friends` | Danh sách được chọn |
| `Private` | Chỉ chủ sở hữu |

- Mặc định **không** phải Public với tài khoản mới.
- Đổi visibility có hiệu lực ngay.
- Share link không được bypass visibility.
- Không real-time location.
- Không public địa chỉ nhà riêng.
- Nội dung Private không được dùng cho public insight.

**Xung đột cần xử lý:** dù không chia sẻ vị trí real-time, `ảnh + địa điểm + thời gian đăng` vẫn tiết lộ user đang ở đâu ngay lúc này. Bản đầu chốt: **cho phép ẩn thời gian**, và không hiển thị "đang ở đây".

**"Verified Visit" — bỏ khái niệm này.** Nếu không dùng GPS bắt buộc và cho phép ảnh từ gallery thì hệ thống không xác thực được gì. Gọi nó là *soft signal* nội bộ, không hiển thị nhãn nào cho user hàm ý hệ thống bảo đảm.

---

## 14. Ranh giới của AI

AI **được**: hiểu intent, phân loại nội dung, đề xuất tag/occasion/topic, lọc, tóm tắt dữ liệu có sẵn, giải thích ngắn vì sao một place phù hợp.

AI **không được**: tạo review, bịa giá, bịa việc user đã đến, tạo nội dung công kích, đưa ra bảo đảm về an toàn địa điểm.

Ràng buộc vận hành:
- Tối đa **một** câu làm rõ trong một discovery flow.
- Không hỏi lại thông tin đã biết.
- Hard constraint (ngân sách, khu vực) không được tự ý bỏ.
- Khi dữ liệu ít hoặc cũ, phải nói rõ.
- Summary phải cho biết số nguồn và độ mới, và phân biệt đồng thuận với ý kiến trái chiều.

**Discovery bằng preset phải hoạt động tốt ngay cả khi AI chưa có.** AI là lớp tăng chất lượng, không phải điều kiện để sản phẩm chạy.

---

## 15. Metrics

### North-star

> Tỷ lệ discovery session dẫn đến **một trải nghiệm được xác nhận** — tức có bài đăng follow-up tại place đó.

Đây là bản thu hẹp so với SRS cũ (vốn gộp cả một lượt Save vào north-star). Lý do: một lượt Save quá dễ tăng mà không chứng minh được Nooka đưa người ra ngoài đời.

`Want to go` là **leading indicator**, không phải north-star.

### Activation — trong 7 ngày đầu

Hoàn thành onboarding · Xem ít nhất một feed · `Want to go` ít nhất một spot · Follow ít nhất một người **hoặc** một Topic.

Không bắt buộc phải thêm bạn mới được tính activated.

### Guardrail

Report rate · Block rate · Tỷ lệ bỏ giữa chừng khi đăng · Notification opt-out rate · Tỷ lệ bài bị remove.

### Chỉ số phải theo dõi sát nhất

**Tỷ lệ user hoạt động có đăng bài.** Đây là chỉ số sống chết của sản phẩm. Nếu nó thấp thì mọi chỉ số khác vô nghĩa.

---

## 16. Giả thuyết cần kiểm chứng

| | Giả thuyết | Sai thì sao |
|---|---|---|
| H1 | User tin ảnh check-in thật hơn review text từ người lạ | Quay lại mô hình review |
| H2 | User chịu đăng nếu chỉ mất vài thao tác | **Sản phẩm không có nội dung → chết** |
| H3 | Recommendation từ người cùng gu giá trị hơn rating trung bình | Taste graph vô dụng |
| H4 | User thích bắt đầu từ "muốn làm gì" hơn từ tên địa điểm | Intent Mode không cần thiết |
| H5 | User cung cấp thêm dữ liệu nếu mỗi lần chỉ hỏi một câu | Không có metadata có cấu trúc → mất moat |
| H6 | Lens/Topic hữu ích hơn hashtag | Bỏ Topic |
| H7 | User check-in lại sau khi đi một chỗ được recommend | Vòng lặp không đóng → không có north-star |
| H8 | Bản đồ cá nhân là động cơ đăng đủ mạnh | Phải tìm động cơ khác cho H2 |

**H2 và H8 là hai giả thuyết phải kiểm chứng trước tiên.** Nếu chúng sai thì không có sản phẩm nào để xây.

---

## 17. Rủi ro đã nhận diện

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Không ai đăng, chỉ lướt | **Cao** | My Nooka Map, đăng ≤ 4 thao tác, feedback loop "{n} people want to go after your post" |
| Nội dung không đủ dày | **Cao** | Quy tắc 20 place, seed 300–500 bài, đi theo cụm quận |
| Trở thành Instagram tệ hơn | Trung bình | Mọi post gắn place, ẩn số follower, không lấy Like làm tín hiệu chính |
| Scope quá rộng, không xong được | **Cao** | Vertical slice ở §10, cắt inbox / topic / recap / invite |
| Sponsored làm mất tin cậy | Trung bình | Nhãn bắt buộc, không tính vào community insight |
| Tên trùng nhãn hiệu | Trung bình | Chưa tra — xem §19 |

---

## 18. Câu hỏi còn mở

Chưa cần chốt trước khi lập kế hoạch, nhưng phải chốt trước khi làm màn hình liên quan:

- Ảnh bắt buộc chụp trực tiếp, hay cho phép gallery?
- Verdict: giữ ba mức `Worth it / Depends / Not worth it`, hay dùng thang khác? *(Ba mức có rủi ro làm user ngại đăng và gây tranh cãi với quán.)*
- Giá là số chính xác hay khoảng giá?
- Public feed có tồn tại ngay từ bản đầu, hay chỉ có Following + Nearby?
- Mở app vào Following hay vào Explore?
- Có giới hạn số bài đăng mỗi ngày?
- Cho đăng bài về chuyến đi cũ (backdate) không?
- Hiển thị số follower không? *(Khuyến nghị: không.)*
- **Gọi người đăng bài là gì?** `Nooka` không cho sẵn một danh xưng cho cộng đồng người đóng góp — đây là thứ `Scout` cho miễn phí mà `Nooka` thì không. Cần đặt một từ, vì §9 dựa vào việc người đăng có danh tính. Ứng viên: `Spotters`, `Locals`, `Regulars`.
- **Gọi một bài đăng là gì trên UI?** Tài liệu này dùng `Post` làm thuật ngữ nội bộ. UI có thể dùng `spot` (danh từ) — cần chốt trước khi viết chuỗi i18n, vì đổi sau sẽ phải sửa toàn bộ locale file.

---

## 19. Việc cần làm tiếp

**Trước khi viết code:**

1. **Xác minh tên** — mình chưa tra, đây là việc của bạn:
   - `ipvietnam.gov.vn`, nhóm 9 và 42, cho `NOOKA`
   - Domain: `nooka.app`, `nooka.vn`, `getnooka.com`, `joinnooka.com`
   - Handle `@nooka`, `@nookaapp` trên Instagram, TikTok, Threads
   - Search `Nooka` trên App Store và CH Play
2. **Bài test 5 người** — đọc tên lên, hỏi "app này làm gì", rồi bảo họ viết ra giấy. Chạy cho `Nooka` và `Scout` để so.
3. Chốt các câu hỏi ở §18 liên quan tới màn hình Create.

**Sau khi review spec này:** lập implementation plan cho vertical slice ở §10.

---

## 20. Tech stack — đã chốt

| Lớp | Lựa chọn |
|---|---|
| Mobile | **React Native + Expo** (EAS build iOS trên cloud — máy dev là Windows) |
| Backend | **Spring Boot + PostgreSQL** |
| Auth | **Firebase Auth** phát hành token, Spring Boot verify JWT. Không tự viết auth |
| Lưu media | **Cloudflare R2** (không phí egress) |
| Push | FCM |
| Hosting | Railway hoặc Fly.io cho backend, Neon cho Postgres |

### Hai ràng buộc kỹ thuật bắt buộc

**R1 — Strip EXIF ở phía server.** Ảnh từ điện thoại chứa tọa độ GPS chính xác và thời gian chụp. Lưu nguyên file là phát tán vị trí người đăng, trái với §13. Xử lý ở server, không tin client.

**R2 — Một điểm nghẽn duy nhất cho phân quyền post.** Spring Boot không có Row Level Security, nên bốn mức visibility ở §13 phải được ép trong **mọi** truy vấn chạm tới Post. Dựng một `Specification` hoặc repository wrapper bắt buộc, cấm viết query Post trực tiếp ở nơi khác. Đây là thành phần duy nhất trong dự án cần viết test trước khi viết code.

---

## Phụ lục A — UI string gốc (locale `en`)

Locale gốc là tiếng Anh. Mọi chuỗi phải qua i18n layer từ commit đầu tiên, không hardcode.

```
Home
  Spotted by {name}
  You follow each other
  {n} people you follow have been here
  Want to go
  Been

Create
  Where were you?
  Add a photo
  Pick a place
  Who can see this?

Search
  Search places, people, posts…
  ✨ Ask Nooka
  Not sure where to go?

Ask Nooka
  What are you in the mood for?
  Matches: {reasons}
  Only {n} spots so far — data is still thin here.

Empty states
  Nobody's posted around here yet.
  Be the first to spot something.

Profile
  {name} · {n} places
  My Nooka Map
```

## Phụ lục B — Typing animation

Màn hình mở app, gõ từng dòng rồi xóa:

```
See it.  Save it.  Go.
```

Splash rotation:

```
Where to tonight?
Good spots don't advertise.
Real people. Real places.
Someone you follow has been here.
```
