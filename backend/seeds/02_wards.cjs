const wardsData = require('../wards.json'); // Đường dẫn đến file json

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
    // 1. Xóa dữ liệu cũ (Dùng truncate để reset ID về 1 nếu cần)
    // Lưu ý: Nếu có bảng con tham chiếu đến wards, hãy dùng .del() thay vì .truncate()
    await knex('wards').del();

    // 2. Chuẩn hóa dữ liệu và sắp xếp thứ tự các trường
    const formattedData = wardsData.map(item => ({
        ward_name: item.ward_name,
        ward_code: item.ward_code,
        ward_type: item.ward_type,
        province_id: item.province_id
        // Cột 'id' sẽ tự động tăng (AUTO_INCREMENT) nên không cần đưa vào đây
    }));

    // 3. Insert dữ liệu theo lô (Batch Insert)
    try {
        // Chia nhỏ mỗi lần insert 500 bản ghi
        await knex.batchInsert('wards', formattedData, 500);
        console.log(`Đã import thành công ${formattedData.length} xã/phường.`);
    } catch (error) {
        console.error('Lỗi nghiêm trọng khi import dữ liệu wards:', error.message);
        throw error; // Quăng lỗi để Knex thông báo dừng tiến trình
    }
};