/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.table('transactions', function(table) {
    table.index(
      ['status', 'is_test', 'transaction_time', 'station_id'],
      'idx_tx_status_test_trxtime_station'
    );
    table.index(
      ['status', 'is_test', 'created_at', 'station_id'],
      'idx_tx_status_test_created_station'
    );
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.table('transactions', function(table) {
    table.dropIndex([], 'idx_tx_status_test_trxtime_station');
    table.dropIndex([], 'idx_tx_status_test_created_station');
  });
};
