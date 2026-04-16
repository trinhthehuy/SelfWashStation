/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  // 1. Xóa dữ liệu cũ trong bảng strategy
  await knex('strategy').del();

  // 2. Tạo danh sách các chiến lược với thông số mặc định
  const strategies = [
    {
      strategy_name: 'Tiêu chuẩn',
      agency_id: 1,
      amount_per_unit: 1000,
      op_per_unit: 60,
      foam_per_unit: 6,
      enabled: 1
    },
    {
      strategy_name: 'Khuyến mại',
      agency_id: 2,
      amount_per_unit: 1000,
      op_per_unit: 60,
      foam_per_unit: 6,
      enabled: 1
    },
    {
      strategy_name: 'Giá rẻ',
      agency_id: 3,
      amount_per_unit: 1000,
      op_per_unit: 60,
      foam_per_unit: 6,
      enabled: 1
    },
    {
      strategy_name: 'Thử nghiệm',
      agency_id: 1,
      amount_per_unit: 2000, // Thử nghiệm một giá trị khác
      op_per_unit: 120,
      foam_per_unit: 10,
      enabled: 0 // Chiến lược này đang tắt
    }
  ];

  // 3. Chèn dữ liệu kèm theo thời gian tạo
  const dataToInsert = strategies.map(item => ({
    ...item,
    created_at: new Date(),
    updated_at: new Date()
  }));

  await knex('strategy').insert(dataToInsert);
};