/**
 * Add email column to system_users and backfill agency accounts from agency.email.
 * This migration is idempotent.
 */
exports.up = async function up(knex) {
  const hasSystemUsers = await knex.schema.hasTable('system_users');
  if (!hasSystemUsers) {
    return;
  }

  const hasEmailColumn = await knex.schema.hasColumn('system_users', 'email');
  if (!hasEmailColumn) {
    await knex.schema.alterTable('system_users', (table) => {
      table.string('email', 191).nullable();
    });
  }

  const hasAgency = await knex.schema.hasTable('agency');
  if (hasAgency) {
    await knex.raw(`
      UPDATE system_users su
      LEFT JOIN agency a ON a.id = su.agency_id
      SET su.email = NULLIF(LOWER(TRIM(a.email)), '')
      WHERE su.role = 'agency'
    `);
  }
};

exports.down = async function down(knex) {
  const hasSystemUsers = await knex.schema.hasTable('system_users');
  if (!hasSystemUsers) {
    return;
  }

  const hasEmailColumn = await knex.schema.hasColumn('system_users', 'email');
  if (hasEmailColumn) {
    await knex.schema.alterTable('system_users', (table) => {
      table.dropColumn('email');
    });
  }
};
