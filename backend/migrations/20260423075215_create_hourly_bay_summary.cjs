/**
 * Migration: Tạo bảng hourly_bay_summary để hợp nhất daily_bay_summary và hourly_station_summary
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('hourly_bay_summary', (table) => {
    table.increments('id').unsigned().primary();
    table.date('summary_date').notNullable();
    table.tinyint('hour').unsigned().notNullable();
    table.integer('station_id').unsigned().notNullable();
    table.string('bay_code', 20).notNullable();
    table.integer('total_transactions').unsigned().notNullable().defaultTo(0);
    table.decimal('total_amount', 15, 2).notNullable().defaultTo(0.00);
    table.integer('total_op_time').notNullable().defaultTo(0);
    table.integer('total_foam_time').notNullable().defaultTo(0);
    table.timestamp('last_updated_at').notNullable().defaultTo(knex.fn.now());

    // Đảm bảo tính duy nhất theo Giờ + Trạm + Cầu
    table.unique(['summary_date', 'hour', 'station_id', 'bay_code'], 'uniq_date_hour_station_bay');
    
    // Index phục vụ truy vấn báo cáo theo ngày/trạm
    table.index(['summary_date', 'station_id'], 'idx_date_station');
    table.index('station_id', 'idx_station');
  });

  console.log('✅ Bảng hourly_bay_summary đã được tạo thành công');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('hourly_bay_summary');
  console.log('✅ Bảng hourly_bay_summary đã được xóa');
};
