/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('agency', table => {
    // Tạo 5 cột từ bank_account_1 đến bank_account_5
    for (let i = 1; i <= 5; i++) {
      table.json(`bank_account_${i}`).nullable().comment('Cấu trúc: {account_number, bank_name, account_name}');
    }
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('agency', table => {
    for (let i = 1; i <= 5; i++) {
      table.dropColumn(`bank_account_${i}`);
    }
  });
};