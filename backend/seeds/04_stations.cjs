/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  const tableName = 'stations';

  // 1. Lấy mapping Bank Account: Mỗi agency_id lấy ID tài khoản nhỏ nhất
    const agenciesBankInfo = await knex('bank_account') // Tên bảng theo lỗi của bạn là bank_account
    .select('agency_id')
    .min('id as bank_account_id')
    .groupBy('agency_id');

    // 2. Lấy mapping Strategy: Mỗi agency_id lấy ID chiến lược nhỏ nhất
    const strategiesInfo = await knex('strategy')
    .select('agency_id')
    .min('id as strategy_id')
    .groupBy('agency_id');

    // 3. Chuyển thành Map tra cứu (giống như trước)
    const agencyBankMap = Object.fromEntries(
    agenciesBankInfo.map(item => [item.agency_id, item.bank_account_id])
    );

    const agencyStrategyMap = Object.fromEntries(
    strategiesInfo.map(item => [item.agency_id, item.strategy_id])
    );
    const availableAgencyIds = agenciesBankInfo
    .map(a => a.agency_id)
    .filter(id => agencyStrategyMap[id]);
  // 2. Lấy danh sách trạm đã có để tránh trùng
  const existingStations = await knex(tableName).pluck('station_name');
  
  const stationsToInsert = [];
  const wardIds = [513, 544, 567, 597];
  const streetNames = ['Trần Hưng Đạo', 'Hùng Vương', 'Nguyễn Công Trứ', 'Trần Phú', 'Lê Đại Hành'];

  // 3. Tạo danh sách 100 trạm
  for (let i = 1; i <= 100; i++) {
    const stationCode = `NB${i.toString().padStart(3, '0')}`;

    if (!existingStations.includes(stationCode)) {
      // Chọn ngẫu nhiên 1 agency_id từ những agency ĐANG CÓ tài khoản ngân hàng
      const randomAgencyId = availableAgencyIds[Math.floor(Math.random() * availableAgencyIds.length)];
      const bankAccountId = agencyBankMap[randomAgencyId];
      const strategyId = agencyStrategyMap[randomAgencyId];

      stationsToInsert.push({
        station_name: stationCode,
        address: `${Math.floor(Math.random() * 500) + 1} đường ${streetNames[Math.floor(Math.random() * streetNames.length)]}`,
        latitude: (20.25 + (Math.random() - 0.5) * 0.05).toFixed(8),
        longitude: (105.97 + (Math.random() - 0.5) * 0.05).toFixed(8),
        province_id: 6,
        ward_id: wardIds[Math.floor(Math.random() * wardIds.length)],
        agency_id: randomAgencyId,
        transfer_prefix: stationCode,
        is_active: 1,
        bank_account_id: bankAccountId, // Khớp chuẩn theo agency_id
        strategy_id: strategyId,  // Lấy ID chiến lược hợp lệ đầu tiên
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    }
  }

  // 4. Chèn dữ liệu
  if (stationsToInsert.length > 0) {
    await knex.batchInsert(tableName, stationsToInsert, 50);
    console.log(`✅ Thành công: Đã bổ sung ${stationsToInsert.length} trạm.`);
    console.log(`🔗 Các trạm được gán bank_account_id dựa trên agency_id tương ứng.`);
  } else {
    console.log('✨ Không có trạm mới nào cần thêm.');
  }
};