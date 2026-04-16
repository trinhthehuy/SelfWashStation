/**
 * Migration: Tạo bảng system_users (idempotent - an toàn khi bảng đã được tạo bởi ensureSchema())
 */
exports.up = async function (knex) {
  const exists = await knex.schema.hasTable('system_users');
  if (exists) return;

  await knex.schema.createTable('system_users', (table) => {
    table.increments('id').primary();
    table.string('username', 64).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('full_name', 128).notNullable();
    table.enu('role', ['sa', 'engineer', 'agency']).notNullable();
    table.integer('agency_id').unsigned().nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.text('avatar').nullable();
    table.timestamp('last_login_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('system_users');
};
