exports.up = function(knex) {
  return knex.schema.createTable('daily_bay_summary', (table) => {
    table.increments('id').primary();
    table.date('summary_date').notNullable();
    table.integer('station_id').notNullable();
    table.string('bay_code').notNullable();
    
    // Các trường dữ liệu tổng hợp
    table.integer('total_transactions').defaultTo(0);
    table.decimal('total_amount', 15, 2).defaultTo(0);    
    table.integer('total_op_time').defaultTo(0); // Tổng thời gian op
    table.integer('total_foam_time').defaultTo(0); // Tổng thời gian foam    
    
    table.timestamp('last_updated_at').defaultTo(knex.fn.now());

    // Tạo unique index để phục vụ việc Upsert (onConflict)
    table.unique(['summary_date', 'station_id', 'bay_code']);
    
    // Index để tối ưu truy vấn báo cáo
    table.index(['summary_date', 'station_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('daily_bay_summary');
};