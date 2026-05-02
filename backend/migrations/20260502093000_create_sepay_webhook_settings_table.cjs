/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('sepay_webhook_settings', (table) => {
    table.increments('id').primary();
    table.string('auth_mode', 32).notNullable().defaultTo('api_key');
    table.text('api_key').notNullable();
    table.text('oauth_bearer_token').notNullable();
    table.integer('updated_by').unsigned().nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.foreign('updated_by').references('id').inTable('system_users').onDelete('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('sepay_webhook_settings');
};