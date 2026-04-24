/**
 * Migration: Tạo bảng daily_bay_summary để tăng tốc độ báo cáo cấp Tỉnh/Đại lý/Trạm
 * Giảm tải tính toán 24 lần so với hourly_bay_summary khi truy vấn theo ngày/tháng/năm
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('daily_bay_summary', (table) => {
    table.increments('id').unsigned().primary();
    table.date('summary_date').notNullable();
    table.integer('station_id').unsigned().notNullable();
    table.string('bay_code', 20).notNullable();
    table.integer('total_transactions').unsigned().notNullable().defaultTo(0);
    table.decimal('total_amount', 15, 2).notNullable().defaultTo(0.00);
    table.integer('total_op_time').notNullable().defaultTo(0);
    table.integer('total_foam_time').notNullable().defaultTo(0);
    table.timestamp('last_updated_at').notNullable().defaultTo(knex.fn.now());

    // Đảm bảo tính duy nhất theo Ngày + Trạm + Cầu
    table.unique(['summary_date', 'station_id', 'bay_code'], 'uniq_daily_station_bay');
    
    // Index phục vụ truy vấn báo cáo nhanh
    table.index(['summary_date', 'station_id'], 'idx_daily_date_station');
    table.index('station_id', 'idx_daily_station');
  });

  console.log('✅ Bảng daily_bay_summary đã được tạo thành công');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('daily_bay_summary');
  console.log('✅ Bảng daily_bay_summary đã được xóa');
};
