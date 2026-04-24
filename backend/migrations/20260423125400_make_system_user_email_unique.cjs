/**
 * Migration: Make email column unique in system_users table.
 */
exports.up = function(knex) {
  return knex.schema.alterTable('system_users', table => {
    // Ensure email is unique and not nullable
    table.string('email', 191).notNullable().unique().alter();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('system_users', table => {
    // Revert unique constraint if needed (though usually not recommended to revert uniqueness on email)
    table.string('email', 191).nullable().dropUnique(['email']).alter();
  });
};
