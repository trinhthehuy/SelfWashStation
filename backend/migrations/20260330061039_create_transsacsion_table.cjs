/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.up = function(knex) {
  return knex.schema
    // 1. transactions
    .createTable('transactions', (table) => {
      table.bigIncrements('id').primary();
      table.string('transaction_id', 128).notNullable().unique();
      table.json('original_payload').nullable();
      table.decimal('amount', 12, 2).notNullable();
      table.string('content', 255).notNullable();
      table.string('account_number', 64).nullable();
      table.integer('station_id').unsigned().nullable();
      table.integer('bay_id').unsigned().nullable();
      table.integer('op').nullable();
      table.integer('foam').nullable();
      table.string('mqtt_topic', 128).nullable();
      table.text('mqtt_payload').nullable();
      table.enum('source', ['webhook', 'sepay', 'manual']).notNullable().defaultTo('webhook');
      table.enum('status', ['processed', 'failed', 'ignored']).notNullable().defaultTo('processed');
      table.boolean('is_test').notNullable().defaultTo(false);
      table.dateTime('transaction_time').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      // Index & Foreign Key
      table.index('station_id', 'idx_station');
      table.index('is_test', 'idx_is_test');
      table.index('created_at', 'idx_created_at');
      table.foreign('station_id').references('id').inTable('stations');
      table.foreign('bay_id').references('id').inTable('wash_bays');
    })

    // 2. test_transactions
    .createTable('test_transactions', (table) => {
      table.bigIncrements('id').primary();
      table.string('transaction_id', 128).notNullable().unique();
      table.string('transaction_ref', 128).nullable();
      table.decimal('amount', 12, 2).notNullable();
      table.string('content', 255).notNullable();
      table.string('account_number', 64).nullable();
      table.integer('station_id').unsigned().nullable();
      table.string('bay_code', 16).nullable();
      table.integer('op').nullable();
      table.integer('foam').nullable();
      table.string('mqtt_topic', 128).nullable();
      table.text('mqtt_payload').nullable();
      table.dateTime('transaction_time').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.text('notes').nullable();

      table.index('station_id', 'idx_test_station');
      table.index('created_at', 'idx_test_created_at');
      table.foreign('station_id').references('id').inTable('stations');
    })

    // 3. processed_webhooks
    .createTable('processed_webhooks', (table) => {
      table.bigIncrements('id').primary();
      table.string('dedupe_key', 256).notNullable().unique();
      table.string('transaction_id', 128).nullable();
      table.json('payload').nullable();
      table.timestamp('processed_at').defaultTo(knex.fn.now());
      table.dateTime('expire_at').nullable();

      table.index('processed_at', 'idx_processed_at');
    })

    // 4. mqtt_settings
    .createTable('mqtt_settings', (table) => {
      table.increments('id').primary();
      table.integer('station_id').unsigned().nullable();
      table.string('broker_url', 255).notNullable();
      table.string('user', 128).nullable();
      table.string('pass_hash', 256).nullable();
      table.string('client_id', 128).nullable();
      table.json('extra').nullable();
      table.boolean('enabled').notNullable().defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.foreign('station_id').references('id').inTable('stations');
    })

    // 5. webhook_logs
    .createTable('webhook_logs', (table) => {
      table.bigIncrements('id').primary();
      table.string('webhook_path', 128).notNullable();
      table.json('payload').nullable();
      table.integer('result_status').nullable();
      table.text('result_body').nullable();
      table.boolean('is_duplicate').notNullable().defaultTo(false);
      table.boolean('is_test').notNullable().defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index('created_at', 'idx_webhook_logs_created_at');
    })

    // 6. api_tokens
    .createTable('api_tokens', (table) => {
      table.string('id', 64).primary();
      table.string('name', 128).notNullable();
      table.text('token').notNullable();
      table.string('token_hash', 256).notNullable().unique();
      table.json('permissions').nullable();
      table.integer('usage_count').notNullable().defaultTo(0);
      table.dateTime('last_used').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    })

    // 7. outgoing_transactions
    .createTable('outgoing_transactions', (table) => {
      table.string('id', 128).primary();
      table.json('payload').nullable();
      table.timestamp('received_at').defaultTo(knex.fn.now());
      table.dateTime('processed_at').nullable();
      table.enum('status', ['pending', 'processed', 'failed']).notNullable().defaultTo('pending');
    });
};

exports.down = async function (knex) {
    // Xóa theo thứ tự ngược lại để tránh lỗi Khóa ngoại (Foreign Key Constraint)
    await knex.schema.dropTableIfExists('wash_bays');
    await knex.schema.dropTableIfExists('stations');
    await knex.schema.dropTableIfExists('agency');
    await knex.schema.dropTableIfExists('wards');
    await knex.schema.dropTableIfExists('provinces');
};