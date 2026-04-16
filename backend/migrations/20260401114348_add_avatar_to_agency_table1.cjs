/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('agency', (table) => {
    table.string('avatar', 255).nullable().after('agency_name'); 

  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('agency', (table) => {
    table.dropColumn('avatar');

  });
};