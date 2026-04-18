/**
 * Create password_reset_tokens table for self-service password reset flow.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('password_reset_tokens', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('token_hash', 64).notNullable().unique();
    table.dateTime('expires_at').notNullable();
    table.dateTime('used_at').nullable();
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());

    table
      .foreign('user_id')
      .references('id')
      .inTable('system_users')
      .onDelete('CASCADE');

    table.index(['user_id', 'used_at'], 'idx_password_reset_user_used');
    table.index(['expires_at'], 'idx_password_reset_expires_at');
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('password_reset_tokens');
};
