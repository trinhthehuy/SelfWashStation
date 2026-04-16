/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('stations', (table) => {
    // 1. Thêm cột bank_account_id và thiết lập FK
    table.integer('bank_account_id').unsigned().nullable();
    table.foreign('bank_account_id')
         .references('id')
         .inTable('bank_account')
         .onDelete('SET NULL'); // Nếu xóa tài khoản, cột này ở station sẽ về NULL

    // 2. Thêm cột strategy_id và thiết lập FK
    table.integer('strategy_id').unsigned().nullable();
    table.foreign('strategy_id')
         .references('id')
         .inTable('strategy')
         .onDelete('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('stations', (table) => {
    // Xóa các ràng buộc khóa ngoại trước khi xóa cột
    table.dropForeign(['bank_account_id']);
    table.dropForeign(['strategy_id']);
    
    // Xóa cột
    table.dropColumn('bank_account_id');
    table.dropColumn('strategy_id');
  });
};