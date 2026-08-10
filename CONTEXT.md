# Nooka domain context

## Social graph

- **Follow**: quan hệ có hướng từ follower tới target. Follow một chiều chỉ tạo `Follower`/`Following`, chưa phải bạn bè.
- **Follow Request**: yêu cầu có hướng khi target dùng private profile. Request không tự hết hạn; người gửi được cancel, người nhận được accept/reject. Chỉ accept mới tạo Follow.
- **Friend**: trạng thái suy ra khi hai account đang follow lẫn nhau. Không có entity hay friend request hai chiều riêng.
- **Close Friend**: lựa chọn riêng tư do từng user quản lý, chỉ hợp lệ khi hai account đang là Friend. Nếu một phía unfollow, quan hệ Friend kết thúc và Close Friend giữa hai account bị gỡ; mutual follow lại không tự khôi phục Close Friend cũ.
- **Private Profile**: account yêu cầu Follow Request được accept trước khi người khác trở thành follower. Profile privacy là cổng ngoài cùng và override cả Post `PUBLIC`; follower đã được accept vẫn được giữ nếu account chuyển từ public sang private.
- **Block**: chặn quan hệ và tương tác hai chiều; có ưu tiên cao hơn Follow/Friend/Close Friend.

## Content and places

- **Post / Check-in Post**: bài xã hội gắn đúng một Spot, có một caption chung, một audience, tối đa 10 hashtag tự do và 1–5 ảnh có thứ tự.
- **Hashtag**: metadata tự do của Post, không phải Tag của Spot. Nhấn hashtag mở Search và kết quả Spot được suy ra từ các Post visible có hashtag đó. Khóa tìm kiếm được normalize Unicode NFC + lowercase để không phân biệt hoa thường; UI giữ cách viết gốc của user.
- **Spot Tag**: taxonomy do hệ thống quản lý, được tổng hợp từ bằng chứng/review của cộng đồng; user không tự tạo Spot Tag trong MVP.
- **Spot**: địa điểm chuẩn thuộc database độc lập của Nooka. OpenStreetMap chỉ được dùng để lookup/đối chiếu, không sở hữu canonical record.
- **Spot Suggestion**: đề xuất Spot còn thiếu, qua chống trùng và vòng đời `PENDING → APPROVED | MERGED | REJECTED` trước khi công khai.
- **Been**: trạng thái cá nhân xác nhận user đã ghé một Spot, được tạo bởi check-in hợp lệ. Xóa Post không xóa Been.
- **Want to go**: trạng thái lưu một Spot để đi sau hoặc quay lại; có thể cùng tồn tại với Been.

## Moderation roles

- **Moderator**: duyệt/reject/merge Spot Suggestion và xử lý report theo phạm vi thành phố/khu vực được giao.
- **Admin**: quản lý taxonomy, seed/canonical Spot, quyền Moderator và thao tác nhạy cảm; không đồng nghĩa với Moderator.

## Draft and upload

- **Check-in Draft**: tối đa một bản nháp local trên thiết bị; hết hạn 7 ngày sau lần chỉnh sửa gần nhất.
- **Pending Upload**: Post local đang chờ upload; tự tiếp tục khi có mạng và chưa visible với audience cho tới khi publish hoàn tất.
