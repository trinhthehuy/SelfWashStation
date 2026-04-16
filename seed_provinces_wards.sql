-- ========================================
-- INSERT DỮ LIỆU PROVINCES (34 tỉnh/TP)
-- ========================================

INSERT INTO provinces (id, province_name, province_code) VALUES
(1, 'Hà Nội', 'HN'),
(2, 'Bắc Ninh', 'BN'),
(3, 'Quảng Ninh', 'QH'),
(4, 'Hải Phòng', 'HP'),
(5, 'Hưng Yên', 'HY'),
(6, 'Ninh Bình', 'NB'),
(7, 'Cao Bằng', 'CB'),
(8, 'Tuyên Quang', 'TQ'),
(9, 'Lào Cai', 'LI'),
(10, 'Thái Nguyên', 'TN'),
(11, 'Lạng Sơn', 'LS'),
(12, 'Phú Thọ', 'PT'),
(13, 'Điện Biên', 'DB'),
(14, 'Lai Châu', 'LU'),
(15, 'Sơn La', 'SL'),
(16, 'Thanh Hóa', 'TH'),
(17, 'Nghệ An', 'NA'),
(18, 'Hà Tĩnh', 'HT'),
(19, 'Quảng Trị', 'QT'),
(20, 'Huế', 'HU'),
(21, 'Đà Nẵng', 'DN'),
(22, 'Quảng Ngãi', 'QI'),
(23, 'Khánh Hòa', 'KH'),
(24, 'Gia Lai', 'GL'),
(25, 'Đắk Lắk', 'DL'),
(26, 'Lâm Đồng', 'LD'),
(27, 'Tây Ninh', 'TI'),
(28, 'Đồng Nai', 'DI'),
(29, 'Hồ Chí Minh', 'HC'),
(30, 'Vĩnh Long', 'VL'),
(31, 'Đồng Tháp', 'DT'),
(32, 'An Giang', 'AG'),
(33, 'Cần Thơ', 'CT'),
(34, 'Cà Mau', 'CM');

-- ========================================
-- DỮ LIỆU WARDS
-- ========================================
-- HƯỚNG DẪN: Import dữ liệu wards từ file backend/wards.json
-- 
-- VÌ DỮ LIỆU WARDS CÓ HƠN 1000 DÒNG NÊN BẠN CÓ THỂ LÀM THEO HƯỚNG DẪN SAU:
--
-- CÁCH 1: Sử dụng Knex để seed dữ liệu từ file wards.json
--   cd backend
--   npx knex seed:run
--
-- CÁCH 2: Insert trực tiếp vào MySQL bằng client
--   - Chuyển file backend/wards.json sang format SQL
--   - Hoặc dùng công cụ hỗ trợ import JSON tích hợp trong MySQL workbench
--
-- CÁCH 3: Dùng script Node.js để convert và import
--   - Đọc wards.json
--   - Sinh INSERT SQL queries
--   - Chạy trên MySQL
--
-- ========================================
-- GHI CHÚ QUAN TRỌNG
-- ========================================
-- 1. Chỉ cần chạy INSERT provinces một lần duy nhất
-- 2. Wards sẽ được import từ migration/seed files hoặc theo hướng dẫn trên
-- 3. Nếu muốn skip wards ngay bây giờ, tiếp tục chạy các lệnh khác
