/**
 * Bảng tổng hợp doanh thu theo giờ ở mức trạm
 * Dùng để vẽ biểu đồ heatmap doanh thu theo giờ trong ngày
 */

exports.up = function(knex) {
  return knex.schema.createTable('hourly_station_summary', (table) => {
    table.increments('id').primary();
    table.date('summary_date').notNullable();
    table.tinyint('hour').unsigned().notNullable();        // 0 - 23
    table.integer('station_id').unsigned().notNullable();

    table.integer('total_transactions').unsigned().defaultTo(0);
    table.decimal('total_amount', 15, 2).defaultTo(0);
    table.integer('total_op_time').defaultTo(0);

    table.timestamp('last_updated_at').defaultTo(knex.fn.now());

    // Unique key để phục vụ Upsert
    table.unique(['summary_date', 'hour', 'station_id'], 'uniq_date_hour_station');

    // Index tối ưu truy vấn
    table.index(['summary_date', 'station_id'], 'idx_date_station');
    table.index('station_id', 'idx_station');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('hourly_station_summary');
};
