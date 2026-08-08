# Nooka — Tổng quan dự án

> Bản tóm tắt tự chứa cho người/công cụ chưa từng thấy repo. Nguồn: `specs/2026-07-27-nooka-design.md`. Khi mâu thuẫn, spec thắng.
>
> File này cố ý **không chứa quyết định về hình thức** — không bố cục, không màu, không typography. Nó chỉ mô tả sản phẩm là gì, phải làm được gì, và bị ràng buộc bởi cái gì.

---

## 1. Sản phẩm

Nooka là **mạng xã hội hình ảnh về những nơi người ta thật sự đã đi**, trong thành phố mình đang sống.

Bình thường người dùng mở app để xem và lướt như một mạng xã hội thông thường. Khi họ có nhu cầu cụ thể — hẹn hò tối nay, tìm chỗ học bài, đi nhóm sáu người — chính khối nội dung xã hội đó được lọc và xếp lại thành feed gợi ý phù hợp.

> Scroll for inspiration. Search with intention.

**Không phải là:** Google Maps thay thế · app chỉ đường · nền tảng review doanh nghiệp · mạng xã hội ảnh tổng quát · chatbot tìm địa điểm · app du lịch. Nooka nói về **đi gần**, không phải đi xa.

### Vòng lặp cốt lõi

```
Someone goes somewhere
  → Posts it in a few taps
  → People see it while scrolling
  → Want to go
  → Someone actually visits
  → Their post enters the feed
```

Mọi thứ tồn tại để khép vòng lặp này. Cái gì không đóng góp vào nó thì nằm ngoài phạm vi.

---

## 2. Thành công nghĩa là gì

**North-star:** tỷ lệ discovery session dẫn tới **một trải nghiệm được xác nhận** — tức có bài đăng follow-up tại chính địa điểm đó. `Want to go` chỉ là leading indicator, không phải đích.

**Chỉ số sống chết:** tỷ lệ người dùng hoạt động **có đăng bài**. Thấp thì mọi chỉ số khác vô nghĩa. Rủi ro số một của sản phẩm là người ta chỉ xem mà không đăng.

**Activation trong 7 ngày đầu:** xong onboarding · xem ít nhất một feed · `Want to go` ít nhất một địa điểm · follow ít nhất một người hoặc một Topic. Không bắt buộc phải thêm bạn.

**Guardrail:** tỷ lệ report · tỷ lệ block · **tỷ lệ bỏ giữa chừng khi đang đăng** · tỷ lệ tắt thông báo · tỷ lệ bài bị gỡ.

---

## 3. Người dùng và bối cảnh

- Bản đầu chỉ TP.HCM, và trong TP.HCM còn thu hẹp tiếp — mở theo từng vài quận, không mở cả thành phố.
- Người dùng chính nói tiếng Việt.
- Địa điểm do người dùng tạo, cộng với 300–500 địa điểm seed thủ công. **Không dùng Google Places làm nguồn dữ liệu gốc.**
- Hệ quả trực tiếp: **giai đoạn đầu dữ liệu rất mỏng.** Kết quả rỗng và "chỉ có 3 kết quả" sẽ xảy ra thường xuyên hơn kết quả đầy. Đây là trạng thái vận hành bình thường, không phải trường hợp hiếm.

---

## 4. Mô hình social

Định vị: **friend-first, không friend-only.** Bạn bè là lớp tin cậy đầu tiên, không phải giới hạn nội dung.

```
Follow (một chiều)   → thấy bài của người đó
Mutual follow        → được đối xử như bạn bè
Close Friends        → danh sách một chiều, riêng tư, không báo cho người được thêm
Block                → chặn mọi tương tác, hai chiều
```

Không có friend request hai chiều — cơ chế đó tạo cold start rất nặng và biến Nooka thành group chat có hình ảnh.

**Mỗi bài đăng phải cho người xem biết vì sao họ thấy nó:**

```
Spotted by Minh · you follow each other
3 people you follow have been here
Popular with people who like quiet cafés
New around Bình Thạnh this week
```

**Nooka cố ý không sao chép:** không lấy số follower làm tín hiệu nổi bật · không lấy Like làm hành động chính · không biến mọi người thành creator · không để ảnh đẹp thắng trải nghiệm hữu ích.

Hành động được ưu tiên: `Want to go` · `Been` · `Ask` · `Invite`.

---

## 5. Hai chế độ sử dụng

**Social Mode** — mở app khi chưa có nhu cầu gì. Xếp hạng theo người + độ mới. Nguồn nội dung theo thứ tự: người đang follow → người cùng gu cùng khu vực → nội dung public chất lượng → nội dung mới quanh khu vực (không phải vị trí real-time).

**Intent Mode** — mở app khi có nhu cầu cụ thể. Người dùng nêu nhu cầu bằng ngôn ngữ tự nhiên, hệ thống bóc tách rồi trả về kết quả xếp theo mức phù hợp:

```
Input:   "date for two tonight, under 500K, easy to talk, D1–D3"

Parsed:  occasion  first date      party   2
         budget    < 500,000₫      area    District 1–3
         time      tonight         vibe    quiet, easy to talk

Chips:   [D1–D3] [Quiet] [Indoor] [Under 500K]
```

Ràng buộc: **tối đa một câu hỏi làm rõ.** Filter sau khi bóc tách phải sửa được.

---

## 6. Dữ liệu

```
City → Area → Spot → Post
                     ├── Media, vibe tags, price, occasion, author
                     └── Comments / Reactions
```

`Spot` có hai loại **ngang hàng**:

- **Place** — café, quán ăn, bar, không gian cố định. Đây là engine giữ chân người dùng.
- **Experience** — workshop, tour, lớp học, sự kiện; **có giá vé**. Đây là engine doanh thu. Bản đầu chưa có booking nhưng object phải tồn tại từ đầu.

Cả hai cùng nhận Post, cùng nhận `Want to go` và `Been`.

`Topic` **không sở hữu** dữ liệu — nó chỉ là lăng kính lọc nhiều Place và Experience.

Vì địa điểm do người dùng tạo tự do nên **bản trùng chắc chắn xảy ra**; cần cơ chế chống trùng và gộp ngay từ đầu.

### Hành động gắn vào đâu

| Hành động | Gắn vào |
|---|---|
| React, Comment, Ask | Post |
| Follow | User |
| **Want to go**, **Been**, Invite | **Place** |

> Người ta thích một *bài đăng*, nhưng thứ họ muốn đi và lưu là một *địa điểm*.

---

## 7. Phạm vi bản đầu

Sáu màn hình, mô tả theo chức năng:

| Màn hình | Phải làm được gì |
|---|---|
| **Home** | Lướt nội dung từ người mình follow và cộng đồng |
| **Create** | Đăng một địa điểm trong **≤ 4 thao tác** |
| **Search** | Hai hệ thống: tìm kiếm thông thường cho truy vấn rõ, và `Ask Nooka` cho nhu cầu mơ hồ |
| **Saved** | Danh sách `Want to go` và `Been` |
| **Profile** | Bản đồ những nơi đã đi + lịch sử bài đăng |
| **Place detail** | Ảnh cộng đồng, thông tin tổng hợp, bình luận, hỏi người đăng |

### Khi đăng bài

```
Bắt buộc   ≥ 1 ảnh · một địa điểm · một mức hiển thị
Tuỳ chọn   giá · dịp · vibe tags · một điều cần biết
           caption · số người · có quay lại không
```

### Ngoài phạm vi bản đầu

Inbox đầy đủ và message request · chat riêng · invite có RSVP nhiều người · người dùng tự tạo và quản lý Topic · recap cá nhân · insight tổng hợp phức tạp · video · swipe mode · public creator profile · tài khoản doanh nghiệp · booking · thanh toán · chỉ đường · tìm trọ · marketplace.

"Hỏi người đăng" ở bản đầu chỉ là **một câu hỏi công khai dưới bài**, không phải chat riêng.

---

## 8. Privacy — đã khoá, không thương lượng

- **Bốn mức hiển thị cho từng bài:** `Public` · `Followers` · `Close friends` · `Private`. Mặc định của tài khoản mới là **Followers**, không phải Public.
- **Không theo dõi vị trí thời gian thực. Không bao giờ.** Không có trạng thái "đang ở gần", không có chấm sống trên bản đồ.
- Ảnh cộng địa điểm cộng thời gian đăng vẫn đủ để lộ người dùng đang ở đâu, nên họ có quyền **ẩn thời gian đăng**.
- Metadata GPS trong ảnh bị xoá ở phía máy chủ trước khi lưu.
- Nội dung `Private` không vào feed công khai, không vào analytics công khai, không vào context gửi cho AI.

---

## 9. Ranh giới của AI

AI **tổ chức, lọc và tóm tắt** nội dung do người thật tạo ra.

AI **không được** tạo review, không tạo giá, không tạo việc ai đó đã đến một nơi. Không bịa. Khi dữ liệu mỏng thì phải nói ra là mỏng, không lấp đầy bằng nội dung tự sinh.

---

## 10. Nền tảng kỹ thuật

| | |
|---|---|
| App | React Native + Expo — **một codebase chung cho iOS và Android** |
| Chế độ sáng/tối | App đi theo cài đặt của hệ điều hành; **không có nút đổi trong app**, nên cả hai chế độ đều xuất hiện với người dùng thật |
| Ngôn ngữ | Chuỗi gốc là tiếng Anh, mọi chuỗi đi qua lớp i18n. Người dùng chính nói tiếng Việt, và bản dịch tiếng Việt thường dài hơn bản tiếng Anh 30–40% |
| Backend | Spring Boot + PostgreSQL |
| Đăng nhập | custom email/password auth + email OTP/password reset + Google/Apple/Facebook OAuth |
| Lưu ảnh | Cloudflare R2 · Thông báo đẩy: FCM |

---

## 11. Chuỗi hiển thị đã chốt (locale gốc `en`)

```
Home        Spotted by {name}
            You follow each other
            {n} people you follow have been here
            Want to go · Been

Create      Where were you?
            Add a photo · Pick a place · Who can see this?

Search      Search places, people, posts…
            ✨ Ask Nooka
            Not sure where to go?

Ask Nooka   What are you in the mood for?
            Matches: {reasons}
            Only {n} spots so far — data is still thin here.

Empty       Nobody's posted around here yet.
            Be the first to spot something.

Profile     {name} · {n} places
            My Nooka Map
```
