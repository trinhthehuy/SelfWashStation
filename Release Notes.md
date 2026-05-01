Version 1.07
1. Bổ sung liên kết đại lý vào bảng Token API
- Cơ sở dữ liệu (Database)
Đã chạy Migration bổ sung cột agency_id vào bảng api_tokens.
Thiết lập liên kết khóa ngoại (Foreign Key) với bảng agency để đảm bảo tính toàn vẹn dữ liệu.
- Backend (Logic xử lý)
Xác thực nâng cao: Khi nhận Webhook thanh toán, hệ thống giờ đây không chỉ kiểm tra Token có hợp lệ hay không mà còn kiểm tra "Trạm này có thuộc quyền quản lý của Đại lý sở hữu Token này không?".
Bảo vệ chéo: Nếu Token của Đại lý A bị sử dụng để gửi lệnh cho trạm của Đại lý B, hệ thống sẽ từ chối ngay lập tức (trả về lỗi Token không có quyền điều khiển trạm của đại lý này).
Token Global: Các Token không gán Đại lý (do Super Admin tạo) vẫn có quyền điều khiển tất cả các trạm như trước đây để đảm bảo tính linh hoạt.
- Frontend (Giao diện quản lý)
Tạo Token: Trong hộp thoại "Tạo token mới", Super Admin giờ đây có thể chọn Đại lý cụ thể để gán cho Token đó.
Danh sách Token: Bổ sung cột "Đại lý" trong bảng quản lý API để dễ dàng theo dõi nguồn gốc và phạm vi của từng Token.
Tự động hóa: Danh sách Đại lý được tải tự động (giới hạn 1000 bản ghi) để hỗ trợ tìm kiếm nhanh khi tạo Token.
Xóa cột token trong Database:
Đã chạy Migration để loại bỏ hoàn toàn cột token (lưu văn bản thuần) khỏi bảng api_tokens.
Bây giờ cơ sở dữ liệu chỉ lưu trữ token_hash (bản băm mật mã). Ngay cả khi DB bị lộ, kẻ tấn công cũng không thể biết được mã Token gốc để giả mạo yêu cầu.
Cập nhật Logic Backend:
Chỉnh sửa ApiTokenService.ts để loại bỏ việc lưu mã gốc khi tạo Token mới.
Hệ thống vẫn sinh ra Token gốc và gửi về Frontend duy nhất một lần ngay khi tạo để người dùng sao chép, sau đó mã này sẽ không bao giờ xuất hiện lại.
2. Loại bỏ dữ liệu ảnh (Avatar) khỏi danh sách đại lý
Vấn đề: Trước đây, khi bạn load danh sách đại lý (kể cả khi load 1000 người cho dropdown), hệ thống sẽ đính kèm toàn bộ dữ liệu ảnh Base64 của từng người. Với 1000 người, lượng dữ liệu này có thể lên tới hàng chục MB, khiến CPU của Server bị nghẽn để xử lý chuỗi văn bản khổng lồ này.
Giải pháp: Tôi đã bỏ việc lấy ảnh trong hàm getAgencies. Bây giờ danh sách chỉ trả về thông tin văn bản (Tên, CCCD, Địa chỉ...), giúp tốc độ phản hồi sẽ trở về mức < 200ms.
3. Tối ưu câu lệnh đếm (Count) cho Trạm
Như đã làm ở bước trước, việc đếm tổng số trạm hiện tại không còn phải "Join" vô ích với 5 bảng khác, giúp giảm tải tối đa cho MySQL.

Version 1.08
1. Rà soát consistency toàn hệ thống: Bổ sung tính năng export báo cáo
2. Rà soát consistency CSS giao diện web và mobile: phát hiện và audit 12 vấn đề không nhất quán
3. Đồng bộ màu sắc giao diện, button và các element liên quan tới màu sắc
4. Đồng bộ CSS cho border và grid vào main.css
5. Đồng bộ CSS cho button vào main.css
6. Dọn dẹp CSS, tối ưu tất cả về main.css