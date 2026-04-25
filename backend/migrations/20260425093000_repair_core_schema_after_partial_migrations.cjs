/**
 * Repair migration for environments that booted with partial/failed migrations.
 * Ensures critical tables/columns used by runtime APIs exist.
 */
exports.up = async function up(knex) {
  const hasSystemUsers = await knex.schema.hasTable('system_users');

  const hasNotifications = await knex.schema.hasTable('notifications');
  if (!hasNotifications && hasSystemUsers) {
    await knex.schema.createTable('notifications', (table) => {
      table.increments('id').primary();
      table
        .integer('recipient_user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('system_users')
        .onDelete('CASCADE');
      table.enum('type', ['FEEDBACK_NEW', 'FEEDBACK_REPLIED', 'SYSTEM_ALERT']).notNullable();
      table.string('title', 255).notNullable();
      table.text('message').notNullable();
      table.string('action_url', 500).nullable();
      table.integer('related_feedback_id').unsigned().nullable();
      table.tinyint('is_read').notNullable().defaultTo(0);
      table.timestamp('read_at').nullable();
      table.tinyint('is_archived').notNullable().defaultTo(0);
      table.timestamps(true, true);
      table.index(['recipient_user_id', 'is_read', 'created_at'], 'idx_notifications_user_unread_date');
      table.index(['recipient_user_id', 'type', 'created_at'], 'idx_notifications_user_type_date');
      table.index(['related_feedback_id'], 'idx_notifications_feedback');
    });

    const hasFeedback = await knex.schema.hasTable('feedback');
    if (hasFeedback) {
      await knex.schema.alterTable('notifications', (table) => {
        table
          .foreign('related_feedback_id')
          .references('id')
          .inTable('feedback')
          .onDelete('SET NULL');
      });
    }
  }

  const hasAuditLogs = await knex.schema.hasTable('audit_logs');
  if (!hasAuditLogs) {
    await knex.schema.createTable('audit_logs', (table) => {
      table.bigIncrements('id').primary();
      table.integer('user_id').unsigned().nullable();
      table.string('email', 64).notNullable();
      table.string('role', 20).notNullable();
      table.string('action', 50).notNullable();
      table.string('entity_type', 50).nullable();
      table.integer('entity_id').unsigned().nullable();
      table.string('entity_name', 200).nullable();
      table.json('details').nullable();
      table.string('ip_address', 45).nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('created_at', 'idx_audit_created_at');
      table.index('user_id', 'idx_audit_user_id');
      table.index('action', 'idx_audit_action');
      table.index('entity_type', 'idx_audit_entity_type');
    });
  } else {
    const hasEmail = await knex.schema.hasColumn('audit_logs', 'email');
    const hasUsername = await knex.schema.hasColumn('audit_logs', 'username');
    if (!hasEmail && hasUsername) {
      await knex.schema.alterTable('audit_logs', (table) => {
        table.renameColumn('username', 'email');
      });
    }
  }

  const hasHourlySummary = await knex.schema.hasTable('hourly_bay_summary');
  if (!hasHourlySummary) {
    await knex.schema.createTable('hourly_bay_summary', (table) => {
      table.increments('id').primary();
      table.integer('station_id').unsigned().notNullable();
      table.date('summary_date').notNullable();
      table.integer('hour').unsigned().notNullable();
      table.integer('total_transactions').unsigned().notNullable().defaultTo(0);
      table.decimal('total_amount', 15, 2).notNullable().defaultTo(0);
      table.integer('total_op_time').unsigned().notNullable().defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['station_id', 'summary_date', 'hour'], 'uq_hourly_bay_summary_station_date_hour');
      table.index(['summary_date', 'hour'], 'idx_hourly_bay_summary_date_hour');
    });
  }

  const hasTransactions = await knex.schema.hasTable('transactions');
  if (hasTransactions) {
    const hasTranDate = await knex.schema.hasColumn('transactions', 'tran_date');
    if (!hasTranDate) {
      await knex.raw(`
        ALTER TABLE transactions
        ADD COLUMN tran_date DATE
        GENERATED ALWAYS AS (DATE(COALESCE(transaction_time, created_at))) STORED
      `);
      await knex.schema.alterTable('transactions', (table) => {
        table.index(['status', 'is_test', 'tran_date', 'station_id'], 'idx_tx_processed_analytics');
        table.index('tran_date', 'idx_tx_tran_date');
      });
    }
  }

  const hasSuAvatar = hasSystemUsers
    ? await knex.schema.hasColumn('system_users', 'avatar')
    : false;
  if (hasSystemUsers && !hasSuAvatar) {
    await knex.schema.alterTable('system_users', (table) => {
      table.text('avatar').nullable();
    });
  }
};

exports.down = async function down() {
  // Intentionally left as no-op to avoid destructive rollback in production repair.
  return Promise.resolve();
};
