/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('system_users');
  if (!hasTable) {
    return;
  }

  const hasColumn = await knex.schema.hasColumn('system_users', 'avatar');
  if (!hasColumn) {
    await knex.schema.alterTable('system_users', (table) => {
      table.text('avatar').nullable();
    });
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('system_users');
  if (!hasTable) {
    return;
  }

  const hasColumn = await knex.schema.hasColumn('system_users', 'avatar');
  if (hasColumn) {
    await knex.schema.alterTable('system_users', (table) => {
      table.dropColumn('avatar');
    });
  }
};
