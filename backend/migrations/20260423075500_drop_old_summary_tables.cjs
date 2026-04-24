/**
 * Migration: Xóa bỏ các bảng summary cũ sau khi đã gộp thành hourly_bay_summary
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.dropTableIfExists('daily_bay_summary');
  await knex.schema.dropTableIfExists('hourly_station_summary');
  console.log('✅ Đã xóa bỏ các bảng summary cũ (daily_bay_summary, hourly_station_summary)');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Không thực hiện khôi phục vì dữ liệu đã được gộp vào bảng mới
  console.log('⚠️ Không thể khôi phục tự động các bảng cũ. Dữ liệu hiện nằm trong hourly_bay_summary.');
};
