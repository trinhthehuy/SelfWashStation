/**
 * Enforce NOT NULL email on both agency and system_users.
 * Backfills empty values with deterministic placeholders to keep migration safe.
 */
exports.up = async function up(knex) {
  const hasAgency = await knex.schema.hasTable('agency');
  const hasSystemUsers = await knex.schema.hasTable('system_users');

  if (hasAgency) {
    await knex.raw(`
      UPDATE agency
      SET email = CONCAT('agency_', id, '@no-email.local')
      WHERE email IS NULL OR TRIM(email) = ''
    `);

    await knex.raw(`
      ALTER TABLE agency
      MODIFY COLUMN email VARCHAR(100) NOT NULL
    `);
  }

  if (hasSystemUsers) {
    await knex.raw(`
      UPDATE system_users su
      LEFT JOIN agency a ON a.id = su.agency_id
      SET su.email = CASE
        WHEN su.role = 'agency' THEN COALESCE(
          NULLIF(LOWER(TRIM(a.email)), ''),
          CONCAT('agency_user_', su.id, '@no-email.local')
        )
        ELSE COALESCE(
          NULLIF(LOWER(TRIM(su.email)), ''),
          CONCAT('user_', su.id, '@no-email.local')
        )
      END
      WHERE su.email IS NULL OR TRIM(su.email) = ''
    `);

    await knex.raw(`
      ALTER TABLE system_users
      MODIFY COLUMN email VARCHAR(191) NOT NULL
    `);
  }
};

exports.down = async function down(knex) {
  const hasAgency = await knex.schema.hasTable('agency');
  const hasSystemUsers = await knex.schema.hasTable('system_users');

  if (hasAgency) {
    await knex.raw(`
      ALTER TABLE agency
      MODIFY COLUMN email VARCHAR(100) NULL
    `);
  }

  if (hasSystemUsers) {
    await knex.raw(`
      ALTER TABLE system_users
      MODIFY COLUMN email VARCHAR(191) NULL
    `);
  }
};
