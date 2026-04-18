/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('smtp_settings', (table) => {
    table.increments('id').primary();
    table.boolean('enabled').notNullable().defaultTo(false);
    table.string('host', 255).notNullable().defaultTo('');
    table.integer('port').notNullable().defaultTo(587);
    table.boolean('secure').notNullable().defaultTo(false);
    table.string('user', 255).notNullable().defaultTo('');
    table.text('pass').notNullable();
    table.string('from_email', 255).notNullable().defaultTo('');
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
  await knex.schema.dropTableIfExists('smtp_settings');
};
