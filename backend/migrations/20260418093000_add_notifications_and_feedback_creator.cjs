/**
 * Migration:
 * - Create notifications table (independent from feedback module)
 * - Extend feedback to support creator-based ownership for all roles
 */
exports.up = async function (knex) {
  const hasNotifications = await knex.schema.hasTable('notifications');
  if (!hasNotifications) {
    await knex.schema.createTable('notifications', (table) => {
      table.increments('id').primary();
      table.integer('recipient_user_id').unsigned().notNullable()
        .references('id').inTable('system_users').onDelete('CASCADE');
      table.enum('type', ['FEEDBACK_NEW', 'FEEDBACK_REPLIED', 'SYSTEM_ALERT']).notNullable();
      table.string('title', 255).notNullable();
      table.text('message').notNullable();
      table.string('action_url', 500).nullable();
      table.integer('related_feedback_id').unsigned().nullable()
        .references('id').inTable('feedback').onDelete('SET NULL');
      table.tinyint('is_read').notNullable().defaultTo(0);
      table.timestamp('read_at').nullable();
      table.tinyint('is_archived').notNullable().defaultTo(0);
      table.timestamps(true, true);

      table.index(['recipient_user_id', 'is_read', 'created_at'], 'idx_notifications_user_unread_date');
      table.index(['recipient_user_id', 'type', 'created_at'], 'idx_notifications_user_type_date');
      table.index(['related_feedback_id'], 'idx_notifications_feedback');
    });
  }

  const hasCreatorUserId = await knex.schema.hasColumn('feedback', 'creator_user_id');
  const hasCreatorRole = await knex.schema.hasColumn('feedback', 'creator_role');
  const hasReadByCreator = await knex.schema.hasColumn('feedback', 'is_read_by_creator');

  await knex.schema.table('feedback', (table) => {
    if (!hasCreatorUserId) {
      table.integer('creator_user_id').unsigned().nullable()
        .references('id').inTable('system_users').onDelete('SET NULL');
    }
    if (!hasCreatorRole) {
      table.string('creator_role', 32).nullable();
    }
    if (!hasReadByCreator) {
      table.tinyint('is_read_by_creator').notNullable().defaultTo(0);
    }
  });

  // Keep backward compatibility by converting historical agency read flag.
  if (!hasReadByCreator) {
    await knex('feedback').update({ is_read_by_creator: knex.ref('is_read_by_agency') });
  }

  // Allow non-agency users to create feedback by making agency_id optional.
  await knex.raw('ALTER TABLE feedback MODIFY COLUMN agency_id INT UNSIGNED NULL');

  await knex.schema.table('feedback', (table) => {
    table.index(['creator_user_id', 'created_at'], 'idx_feedback_creator_date');
    table.index(['creator_user_id', 'status', 'is_read_by_creator'], 'idx_feedback_creator_status_read');
  });
};

exports.down = async function (knex) {
  const hasNotifications = await knex.schema.hasTable('notifications');
  if (hasNotifications) {
    await knex.schema.dropTableIfExists('notifications');
  }

  const hasCreatorUserId = await knex.schema.hasColumn('feedback', 'creator_user_id');
  const hasCreatorRole = await knex.schema.hasColumn('feedback', 'creator_role');
  const hasReadByCreator = await knex.schema.hasColumn('feedback', 'is_read_by_creator');

  await knex.schema.table('feedback', (table) => {
    table.dropIndex([], 'idx_feedback_creator_date');
    table.dropIndex([], 'idx_feedback_creator_status_read');
    if (hasCreatorUserId) table.dropColumn('creator_user_id');
    if (hasCreatorRole) table.dropColumn('creator_role');
    if (hasReadByCreator) table.dropColumn('is_read_by_creator');
  });

  // Best-effort rollback to original nullability.
  await knex.raw('ALTER TABLE feedback MODIFY COLUMN agency_id INT UNSIGNED NOT NULL');
};
