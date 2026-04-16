exports.up = function(knex) {
  return knex.schema.table('stations', (table) => {
    // Xóa các cột theo yêu cầu
    table.dropColumn('bank_account');
    table.dropColumn('amount_per_unit');
    table.dropColumn('op_per_unit');
    table.dropColumn('foam_per_unit');
    table.dropColumn('enabled');
  });
};

exports.down = function(knex) {
  return knex.schema.table('stations', (table) => {
    // Khôi phục lại các cột nếu rollback migration
    // Lưu ý: Phải định nghĩa giống hệt lúc tạo ban đầu
    table.json('bank_account').nullable();
    table.decimal('amount_per_unit', 11, 2).notNullable().defaultTo(1000);
    table.integer('op_per_unit').notNullable().defaultTo(60);
    table.integer('foam_per_unit').notNullable().defaultTo(6);
    table.tinyint('enabled', 1).notNullable().defaultTo(1);
  });
};