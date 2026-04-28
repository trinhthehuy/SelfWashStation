/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('api_tokens', table => {
    table.integer('agency_id').unsigned().nullable().after('name');
    table.foreign('agency_id').references('agency.id').onDelete('CASCADE');
    table.index(['agency_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('api_tokens', table => {
    table.dropForeign(['agency_id']);
    table.dropColumn('agency_id');
  });
};
