/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('strategy', (table) => {
    table.increments('id').primary();

    // Thêm cột tên chiến lược
    table.string('strategy_name').notNullable().comment('Tên của chiến lược giá');

    // Khóa ngoại liên kết với bảng agency
    table.integer('agency_id').unsigned().notNullable();
    table.foreign('agency_id')
         .references('id')
         .inTable('agency')
         .onDelete('CASCADE');

    // Các trường định nghĩa thông số
    table.decimal('amount_per_unit', 11, 2).notNullable().defaultTo(1000);
    table.integer('op_per_unit').notNullable().defaultTo(60);
    table.integer('foam_per_unit').notNullable().defaultTo(6);
    
    // Trạng thái kích hoạt (1: Bật, 0: Tắt)
    table.tinyint('enabled', 1).notNullable().defaultTo(1);

    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('strategy');
};