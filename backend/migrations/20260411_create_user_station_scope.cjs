/**
 * Migration: Create user_station_scope table
 * Maps station_supervisor users to the specific stations they are allowed to manage.
 * Supports cross-agency assignments.
 */

exports.up = async function (knex) {
  await knex.schema.createTable('user_station_scope', (table) => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('system_users')
      .onDelete('CASCADE');
    table
      .integer('station_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('stations')
      .onDelete('CASCADE');
    table.unique(['user_id', 'station_id']);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('user_station_scope');
};
