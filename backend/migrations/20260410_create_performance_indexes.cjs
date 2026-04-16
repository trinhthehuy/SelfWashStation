/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Index trên stations table
    await knex.schema.table('stations', function(table) {
        table.index(['province_id', 'is_active'], 'idx_stations_province_active');
        table.index(['ward_id', 'is_active'], 'idx_stations_ward_active');
        table.index(['agency_id', 'is_active'], 'idx_stations_agency_active');
    });

    // Index trên wash_bays table
    await knex.schema.table('wash_bays', function(table) {
        table.index(['station_id', 'bay_status'], 'idx_wash_bays_station_status');
    });

    // Index trên daily_bay_summary table
    await knex.schema.table('daily_bay_summary', function(table) {
        table.index(['summary_date', 'station_id'], 'idx_daily_bay_summary_date_station');
        table.index(['bay_code'], 'idx_daily_bay_summary_bay_code');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.table('stations', function(table) {
        table.dropIndex([], 'idx_stations_province_active');
        table.dropIndex([], 'idx_stations_ward_active');
        table.dropIndex([], 'idx_stations_agency_active');
    });

    await knex.schema.table('wash_bays', function(table) {
        table.dropIndex([], 'idx_wash_bays_station_status');
    });

    await knex.schema.table('daily_bay_summary', function(table) {
        table.dropIndex([], 'idx_daily_bay_summary_date_station');
        table.dropIndex([], 'idx_daily_bay_summary_bay_code');
    });
};
