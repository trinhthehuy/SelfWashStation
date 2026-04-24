/**
 * Migration: Remove username column from system_users table.
 */
exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('system_users', 'username');
  if (hasColumn) {
    return knex.schema.alterTable('system_users', table => {
      table.dropColumn('username');
    });
  }
};

exports.down = function(knex) {
  return knex.schema.alterTable('system_users', table => {
    // Add back as nullable and unique
    table.string('username', 64).nullable().unique();
  });
};
