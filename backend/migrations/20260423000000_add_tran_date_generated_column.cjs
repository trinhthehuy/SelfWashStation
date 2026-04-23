/**
 * Migration: Thêm Generated Column `tran_date` vào bảng `transactions`
 *
 * Mục tiêu tối ưu:
 * - Các query dùng DATE(created_at) hoặc DATE(COALESCE(transaction_time, created_at))
 *   khiến MySQL không thể dùng index → Full Table Scan.
 * - Giải pháp: Tạo STORED generated column `tran_date` được tính sẵn từ
 *   COALESCE(transaction_time, created_at), sau đó đánh index lên cột này.
 * - Kết quả: Các query GROUP BY/WHERE theo ngày sẽ dùng Index Seek thay vì Full Scan.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Bước 1: Thêm STORED generated column tran_date
  // STORED = giá trị được tính và lưu vật lý → có thể đánh index
  await knex.raw(`
    ALTER TABLE transactions
    ADD COLUMN tran_date DATE
      GENERATED ALWAYS AS (DATE(COALESCE(transaction_time, created_at)))
      STORED
  `);

  // Bước 2: Index composite phục vụ getHourlyReport (heatmap)
  // Query: WHERE status='processed' AND is_test=false AND tran_date BETWEEN ? AND ?
  //        GROUP BY HOUR(...), DAYOFWEEK(...)
  await knex.schema.table('transactions', (table) => {
    table.index(
      ['status', 'is_test', 'tran_date', 'station_id'],
      'idx_tx_status_test_trandate_station'
    );
  });

  // Bước 3: Index riêng cho tran_date (dùng trong aggregation range filter)
  await knex.schema.table('transactions', (table) => {
    table.index('tran_date', 'idx_tx_tran_date');
  });

  console.log('✅ Generated column tran_date + indexes added successfully');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Xóa index trước, sau đó xóa column
  await knex.schema.table('transactions', (table) => {
    table.dropIndex([], 'idx_tx_status_test_trandate_station');
    table.dropIndex([], 'idx_tx_tran_date');
  });

  await knex.raw(`
    ALTER TABLE transactions
    DROP COLUMN tran_date
  `);

  console.log('✅ Generated column tran_date + indexes dropped successfully');
};
