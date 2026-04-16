/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('system_users', (table) => {
    table.text('avatar').nullable().after('is_active');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('system_users', (table) => {
    table.dropColumn('avatar');
  });
};
