/**
 * Migration: Create user_province_scope table
 * Maps regional_manager users to the provinces they are allowed to manage.
 */

exports.up = async function (knex) {
  await knex.schema.createTable('user_province_scope', (table) => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('system_users')
      .onDelete('CASCADE');
    table
      .integer('province_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('provinces')
      .onDelete('CASCADE');
    table.unique(['user_id', 'province_id']);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('user_province_scope');
};
