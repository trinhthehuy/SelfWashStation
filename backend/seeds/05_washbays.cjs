/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  // Bỏ kiểm tra khóa ngoại trước khi seed
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');

  // Xóa dữ liệu cũ trước khi chèn
  await knex('wash_bays').del();

  // Lấy danh sách station ids từ bảng stations
  const stations = await knex('stations').select('id');
  const stationIds = stations.map(s => s.id);

  const bays = [];

  // Cho mỗi trạm, tạo ngẫu nhiên 3 hoặc 5 bays
  for (const stationId of stationIds) {
    const numBays = Math.random() < 0.5 ? 3 : 5; // Ngẫu nhiên 3 hoặc 5

    for (let b = 1; b <= numBays; b++) {
      const bayNumber = String(b).padStart(2, '0');
      const bayCode = `BY${bayNumber}`;

      bays.push({
        bay_code: bayCode,
        bay_status: 1,
        station_id: stationId,
      });
    }
  }

  // Chèn dữ liệu vào database
  await knex('wash_bays').insert(bays);

  // Bật lại kiểm tra khóa ngoại
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');
};