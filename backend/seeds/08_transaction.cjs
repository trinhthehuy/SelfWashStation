const transactionsData = require('../transaction_seed.json'); // Đường dẫn đến file json

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  // 1. Xóa dữ liệu cũ để tránh trùng lặp
  // Dùng .del() nếu có ràng buộc khóa ngoại, .truncate() nếu muốn reset ID về 1
  await knex('transactions').truncate();

  // 2. Hàm bổ trợ định dạng ngày tháng (Chuyển M/D/YYYY thành YYYY-MM-DD)
  const formatDateTime = (dateStr) => {
    if (!dateStr || dateStr === "") return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 19).replace('T', ' ');
  };

  // 3. Chuẩn hóa dữ liệu trước khi insert
  const formattedData = transactionsData.map(item => ({
    transaction_id: item.transaction_id,
    original_payload: item.original_payload || null,
    amount: item.amount,
    content: item.content,
    station_id: item.station_id,
    bay_code: item.bay_code,
    bay_id: item.bay_id || null,
    op: item.op,
    foam: item.foam,
    mqtt_topic: item.mqtt_topic,
    mqtt_payload: item.mqtt_payload,
    source: item.source,
    status: item.status,
    is_test: item.is_test || 0,
    transaction_time: formatDateTime(item.transaction_time),
    created_at: formatDateTime(item.created_at) || knex.fn.now(),
    updated_at: formatDateTime(item.updated_at) || knex.fn.now()
  }));

  // 4. Thực hiện Insert theo lô (Batch Insert) để tối ưu hiệu năng
  try {
    const CHUNK_SIZE = 500;
    await knex.batchInsert('transactions', formattedData, CHUNK_SIZE);
    console.log(`Successfully seeded ${formattedData.length} transactions.`);
  } catch (error) {
    console.error('Error seeding transactions:', error);
    throw error;
  }
};