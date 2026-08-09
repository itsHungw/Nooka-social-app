-- Mục 6.3 của spec.
--
-- Giờ mở cửa ở V3_7 lưu kiểu `time` không có timezone, vì "mở 7 giờ sáng" là
-- một câu nói về giờ địa phương chứ không phải một thời điểm tuyệt đối. Muốn
-- đổi nó thành thời điểm tuyệt đối để so với `now()` thì cần biết địa phương
-- nào — cột này là chỗ giữ câu trả lời đó.
--
-- Mặc định là TP.HCM vì §11 khoá khu vực khởi điểm ở Quận 1, Quận 3 và
-- Bình Thạnh.

alter table cities add column timezone text not null default 'Asia/Ho_Chi_Minh';
