/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('system_users');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('system_users', 'must_change_password');
  if (hasColumn) return;

  await knex.schema.alterTable('system_users', (table) => {
    table.boolean('must_change_password').notNullable().defaultTo(false);
  });
};

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable('system_users');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('system_users', 'must_change_password');
  if (!hasColumn) return;

  await knex.schema.alterTable('system_users', (table) => {
    table.dropColumn('must_change_password');
  });
};
