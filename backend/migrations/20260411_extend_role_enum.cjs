/**
 * Migration: Extend system_users.role ENUM to include regional_manager and station_supervisor
 */

exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE system_users
    MODIFY COLUMN role ENUM('sa', 'engineer', 'agency', 'regional_manager', 'station_supervisor')
    NOT NULL DEFAULT 'agency'
  `);
};

exports.down = async function (knex) {
  // Remove any users with the new roles before rolling back the enum
  await knex('system_users')
    .whereIn('role', ['regional_manager', 'station_supervisor'])
    .delete();

  await knex.raw(`
    ALTER TABLE system_users
    MODIFY COLUMN role ENUM('sa', 'engineer', 'agency')
    NOT NULL DEFAULT 'agency'
  `);
};
