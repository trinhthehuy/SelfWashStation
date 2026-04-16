/**
 * Migration: Bổ sung các indexes cần thiết cho database
 * 
 * Rà soát và bổ sung indexes để tối ưu hóa các query thường xuyên:
 * - Geographic lookup: provinces, wards, agency
 * - Configuration lookups: strategy, bank_account, mqtt_settings
 * - User management: system_users filters
 * - Feedback & queue processing
 * - API token management
 */
exports.up = async function(knex) {
  try {
    // ============================================================
    // I. GEOGRAPHIC & ORGANIZATIONAL HIERARCHY
    // ============================================================

    // 1. provinces - Index for province_code lookups
    await knex.schema.table('provinces', (table) => {
      table.index('province_code', 'idx_province_code');
    });

    // 2. wards - Index for province_id lookups
    await knex.schema.table('wards', (table) => {
      table.index('province_id', 'idx_wards_province_id');
    });

    // 3. agency - Index for ward_id + is_active (active agencies by location)
    await knex.schema.table('agency', (table) => {
      table.index(['ward_id', 'is_active'], 'idx_agency_ward_active');
      table.index('is_active', 'idx_agency_is_active');
    });

    // ============================================================
    // II. CONFIGURATION & SETTINGS TABLES
    // ============================================================

    // 4. strategy - Index for agency_id lookups + enabled filter
    await knex.schema.table('strategy', (table) => {
      table.index(['agency_id', 'enabled'], 'idx_strategy_agency_enabled');
      table.index('agency_id', 'idx_strategy_agency_id');
    });

    // 5. bank_account - Index for agency_id lookups
    await knex.schema.table('bank_account', (table) => {
      table.index(['agency_id', 'active'], 'idx_bank_account_agency_active');
      table.index('agency_id', 'idx_bank_account_agency_id');
    });

    // 6. mqtt_settings - Index for station_id + enabled
    await knex.schema.table('mqtt_settings', (table) => {
      table.index(['station_id', 'enabled'], 'idx_mqtt_settings_station_enabled');
      table.index('station_id', 'idx_mqtt_settings_station_id');
    });

    // ============================================================
    // III. USER MANAGEMENT & AUTHENTICATION
    // ============================================================

    // 7. system_users - Indexes for role filtering and access control
    await knex.schema.table('system_users', (table) => {
      table.index('role', 'idx_system_users_role');
      table.index('agency_id', 'idx_system_users_agency_id');
      table.index(['agency_id', 'is_active'], 'idx_system_users_agency_active');
      table.index(['is_active', 'role'], 'idx_system_users_active_role');
    });

    // 8. api_tokens - Index for token_hash lookups
    // (Even though token_hash has UNIQUE constraint which acts as index,
    //  explicit index helps query planner with composite queries)
    await knex.schema.table('api_tokens', (table) => {
      table.index('token_hash', 'idx_api_tokens_hash');
      table.index(['token_hash', 'usage_count'], 'idx_api_tokens_hash_usage');
    });

    // ============================================================
    // IV. FEEDBACK & SUPPORT SYSTEM
    // ============================================================

    // 9. feedback - Indexes for agency + status filtering
    await knex.schema.table('feedback', (table) => {
      table.index(['agency_id', 'status', 'created_at'], 'idx_feedback_agency_status_date');
      table.index(['agency_id', 'status'], 'idx_feedback_agency_status');
      table.index('status', 'idx_feedback_status');
      table.index(['created_at', 'status'], 'idx_feedback_date_status');
      table.index(['agency_id', 'is_read_by_agency', 'created_at'], 'idx_feedback_unread');
    });

    // ============================================================
    // V. TRANSACTION QUEUE MANAGEMENT
    // ============================================================

    // 10. outgoing_transactions - Index for status + processed_at (queue management)
    await knex.schema.table('outgoing_transactions', (table) => {
      table.index(['status', 'processed_at'], 'idx_outgoing_tx_status_processed');
      table.index('status', 'idx_outgoing_tx_status');
      table.index(['status', 'received_at'], 'idx_outgoing_tx_status_received');
    });

    // ============================================================
    // VI. TRANSACTION & WEBHOOK PROCESSING (ENHANCEMENT)
    // ============================================================

    // 11. transactions - Additional index for bay_id lookups
    await knex.schema.table('transactions', (table) => {
      table.index('bay_id', 'idx_transactions_bay_id');
      table.index(['bay_id', 'transaction_time'], 'idx_transactions_bay_datetime');
      table.index(['amount', 'created_at'], 'idx_transactions_amount_date');
    });

    // 12. test_transactions - Additional index for bay_code lookups
    await knex.schema.table('test_transactions', (table) => {
      table.index('bay_code', 'idx_test_transactions_bay_code');
      table.index(['transaction_time'], 'idx_test_transactions_time');
    });

    // 13. processed_webhooks - Index for dedupe_key + expiration
    await knex.schema.table('processed_webhooks', (table) => {
      table.index(['expire_at'], 'idx_processed_webhooks_expire');
      table.index(['processed_at', 'expire_at'], 'idx_processed_webhooks_cleanup');
    });

    // 14. webhook_logs - Enhanced indexes for debugging
    await knex.schema.table('webhook_logs', (table) => {
      table.index('webhook_path', 'idx_webhook_logs_path');
      table.index(['webhook_path', 'created_at'], 'idx_webhook_logs_path_date');
      table.index(['is_duplicate', 'created_at'], 'idx_webhook_logs_duplicate');
      table.index(['is_test', 'created_at'], 'idx_webhook_logs_test');
    });

    // ============================================================
    // VII. WASH BAYS (ENHANCEMENT)
    // ============================================================

    // 15. wash_bays - Index for bay_code lookups
    await knex.schema.table('wash_bays', (table) => {
      table.index('bay_code', 'idx_wash_bays_code');
      table.index(['station_id', 'bay_code'], 'idx_wash_bays_station_code');
    });

    console.log('✅ All comprehensive indexes added successfully');
  } catch (error) {
    console.error('❌ Error adding indexes:', error);
    // Re-throw to let knex migration system handle the error
    throw error;
  }
};

exports.down = async function(knex) {
  try {
    // Drop in reverse order of creation

    // I. GEOGRAPHIC & ORGANIZATIONAL
    await knex.schema.table('provinces', (table) => {
      table.dropIndex([], 'idx_province_code');
    });

    await knex.schema.table('wards', (table) => {
      table.dropIndex([], 'idx_wards_province_id');
    });

    await knex.schema.table('agency', (table) => {
      table.dropIndex([], 'idx_agency_ward_active');
      table.dropIndex([], 'idx_agency_is_active');
    });

    // II. CONFIGURATION & SETTINGS
    await knex.schema.table('strategy', (table) => {
      table.dropIndex([], 'idx_strategy_agency_enabled');
      table.dropIndex([], 'idx_strategy_agency_id');
    });

    await knex.schema.table('bank_account', (table) => {
      table.dropIndex([], 'idx_bank_account_agency_active');
      table.dropIndex([], 'idx_bank_account_agency_id');
    });

    await knex.schema.table('mqtt_settings', (table) => {
      table.dropIndex([], 'idx_mqtt_settings_station_enabled');
      table.dropIndex([], 'idx_mqtt_settings_station_id');
    });

    // III. USER MANAGEMENT
    await knex.schema.table('system_users', (table) => {
      table.dropIndex([], 'idx_system_users_role');
      table.dropIndex([], 'idx_system_users_agency_id');
      table.dropIndex([], 'idx_system_users_agency_active');
      table.dropIndex([], 'idx_system_users_active_role');
    });

    await knex.schema.table('api_tokens', (table) => {
      table.dropIndex([], 'idx_api_tokens_hash');
      table.dropIndex([], 'idx_api_tokens_hash_usage');
    });

    // IV. FEEDBACK
    await knex.schema.table('feedback', (table) => {
      table.dropIndex([], 'idx_feedback_agency_status_date');
      table.dropIndex([], 'idx_feedback_agency_status');
      table.dropIndex([], 'idx_feedback_status');
      table.dropIndex([], 'idx_feedback_date_status');
      table.dropIndex([], 'idx_feedback_unread');
    });

    // V. TRANSACTION QUEUE
    await knex.schema.table('outgoing_transactions', (table) => {
      table.dropIndex([], 'idx_outgoing_tx_status_processed');
      table.dropIndex([], 'idx_outgoing_tx_status');
      table.dropIndex([], 'idx_outgoing_tx_status_received');
    });

    // VI. TRANSACTION ENHANCEMENTS
    await knex.schema.table('transactions', (table) => {
      table.dropIndex([], 'idx_transactions_bay_id');
      table.dropIndex([], 'idx_transactions_bay_datetime');
      table.dropIndex([], 'idx_transactions_amount_date');
    });

    await knex.schema.table('test_transactions', (table) => {
      table.dropIndex([], 'idx_test_transactions_bay_code');
      table.dropIndex([], 'idx_test_transactions_time');
    });

    await knex.schema.table('processed_webhooks', (table) => {
      table.dropIndex([], 'idx_processed_webhooks_expire');
      table.dropIndex([], 'idx_processed_webhooks_cleanup');
    });

    await knex.schema.table('webhook_logs', (table) => {
      table.dropIndex([], 'idx_webhook_logs_path');
      table.dropIndex([], 'idx_webhook_logs_path_date');
      table.dropIndex([], 'idx_webhook_logs_duplicate');
      table.dropIndex([], 'idx_webhook_logs_test');
    });

    // VII. WASH BAYS
    await knex.schema.table('wash_bays', (table) => {
      table.dropIndex([], 'idx_wash_bays_code');
      table.dropIndex([], 'idx_wash_bays_station_code');
    });

    console.log('✅ All comprehensive indexes dropped successfully');
  } catch (error) {
    console.error('❌ Error dropping indexes:', error);
    throw error;
  }
};
