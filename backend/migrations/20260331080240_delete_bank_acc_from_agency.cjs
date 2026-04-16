/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('agency', table => {
    // Xóa 5 cột bank_account từ 1 đến 5
    for (let i = 1; i <= 5; i++) {
      table.dropColumn(`bank_account_${i}`);
    }
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('agency', table => {
    // Khôi phục lại các cột nếu cần rollback
    for (let i = 1; i <= 5; i++) {
      table.json(`bank_account_${i}`)
           .nullable()
           .comment('Cấu trúc: {account_number, bank_name, account_name}');
    }
  });
};