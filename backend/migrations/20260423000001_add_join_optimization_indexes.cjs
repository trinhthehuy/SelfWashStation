/**
 * Migration: Tối ưu hóa các JOIN phức tạp trong báo cáo doanh thu
 *
 * Vấn đề:
 *   getRevenueReport() JOIN 6-7 bảng cùng lúc:
 *     daily_bay_summary → stations → agency → wards → provinces
 *   Các cột dùng để JOIN/WHERE thiếu Composite Index phù hợp
 *   → MySQL phải thực hiện Nested Loop Join với Full Scan trên nhiều bảng
 *
 * Giải pháp: Thêm Covering Index và Composite Index được thiết kế
 *   theo thứ tự cột khớp với JOIN + WHERE + GROUP BY pattern thực tế.
 *
 * Nguyên tắc:
 *   1. Covering Index: index chứa đủ các cột cần SELECT → tránh "back to table"
 *   2. Composite Index thứ tự: (equality cols) → (range col) → (select cols)
 *   3. JOIN column phải là leftmost của index để MySQL dùng được ref-join
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function(knex) {
    // ============================================================
    // I. BẢNG daily_bay_summary
    // ============================================================
    //
    // Pattern truy vấn chính:
    //   WHERE summary_date BETWEEN ? AND ?            (range filter)
    //   WHERE station_id = ? / IN (...)               (scope filter)
    //   WHERE bay_code LIKE ?                         (search filter)
    //   SELECT station_id, bay_code, total_amount ... (data columns)
    //
    // Index hiện tại: (summary_date, station_id) — thiếu bay_code và amount
    // Index mới: covering index với đầy đủ payload columns

    await knex.schema.table('daily_bay_summary', (table) => {
        // Covering index cho query báo cáo theo station + date range
        // Thứ tự: station_id (equality từ JOIN) → summary_date (range)
        // → MySQL dùng ref cho JOIN, sau đó range scan theo date
        table.index(
            ['station_id', 'summary_date', 'total_amount', 'total_transactions', 'total_op_time'],
            'idx_dbs_station_date_covering'
        );

        // Index cho query lọc theo bay_code (level=bay + keyword search)
        // Thứ tự: station_id (từ JOIN scope) → bay_code (equality/search)
        table.index(
            ['station_id', 'bay_code', 'summary_date'],
            'idx_dbs_station_bay_date'
        );
    });

    // ============================================================
    // II. BẢNG stations — Covering Index cho JOIN dimension lookups
    // ============================================================
    //
    // Pattern: dbs JOIN stations ON dbs.station_id = s.id
    //   + WHERE s.province_id IN (...)   → scoped_province_ids filter
    //   + WHERE s.agency_id = ?          → agency scope
    //   + SELECT s.station_name, s.address, s.province_id, s.ward_id, s.agency_id
    //
    // Covering index: khi MySQL JOIN stations, nếu index chứa đủ cột cần SELECT
    // → không cần "back to table" → giảm đáng kể I/O

    await knex.schema.table('stations', (table) => {
        // Covering index cho JOIN từ daily_bay_summary + SELECT các dimension
        // Dùng khi level = station/bay và cần lookup s.province_id, s.ward_id, s.agency_id
        table.index(
            ['id', 'agency_id', 'province_id', 'ward_id', 'is_active'],
            'idx_stations_join_covering'
        );

        // Composite index cho filter scoped_province_ids + is_active
        // Cải tiến idx_stations_province_active hiện tại: thêm agency_id để covering cho
        // query GROUP BY level=province cần COUNT(DISTINCT agency_id)
        table.index(
            ['province_id', 'is_active', 'agency_id', 'ward_id'],
            'idx_stations_province_active_covering'
        );

        // Composite index cho filter agency_id + is_active + covering ward_id
        // Phục vụ query GROUP BY level=agency: COUNT(DISTINCT ward_id)
        table.index(
            ['agency_id', 'is_active', 'ward_id', 'province_id'],
            'idx_stations_agency_active_covering'
        );

        // Composite index cho filter ward_id + is_active + covering agency_id
        table.index(
            ['ward_id', 'is_active', 'agency_id'],
            'idx_stations_ward_active_covering'
        );
    });

    // ============================================================
    // III. BẢNG agency — Index cho JOIN và dimension lookup
    // ============================================================
    //
    // Pattern:
    //   stations JOIN agency ON s.agency_id = a.id
    //   agency JOIN provinces ON a.province_id = ap.id   ← THIẾU INDEX
    //   agency JOIN wards ON a.ward_id = aw.id
    //   SELECT a.agency_name, a.identity_number, a.province_id, a.ward_id
    //
    // a.province_id chưa có index đơn → JOIN ap phải scan toàn bảng agency

    await knex.schema.table('agency', (table) => {
        // Index cho JOIN a.province_id → provinces.id
        // Kèm covering columns thường dùng trong SELECT của báo cáo level=agency
        table.index(
            ['province_id', 'is_active', 'ward_id'],
            'idx_agency_province_active_ward'
        );

        // Covering index cho JOIN từ stations: agency.id (PK) → SELECT fields
        // MySQL thường dùng khi cần a.agency_name, a.identity_number
        table.index(
            ['id', 'province_id', 'ward_id'],
            'idx_agency_id_covering'
        );
    });

    // ============================================================
    // IV. BẢNG wash_bays — Covering Index cho subquery đếm bay
    // ============================================================
    //
    // Pattern trong getRevenueReport():
    //   SELECT COUNT(*) FROM wash_bays WHERE bay_status = 1 AND station_id = s.id
    //   → Correlated subquery chạy cho MỖI row trong GROUP BY
    //
    // Index hiện tại: (station_id, bay_status) — đã có nhưng thứ tự ngược
    // với điều kiện WHERE bay_status = 1 (equality) + station_id (from outer)
    // Theo MySQL: equality nên đứng trước → (bay_status, station_id) tốt hơn

    await knex.schema.table('wash_bays', (table) => {
        // Covering index cho correlated subquery: WHERE bay_status=1 AND station_id=?
        table.index(
            ['bay_status', 'station_id'],
            'idx_wash_bays_status_station'
        );
    });

    console.log('✅ Join optimization indexes added successfully');
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function(knex) {
    await knex.schema.table('daily_bay_summary', (table) => {
        table.dropIndex([], 'idx_dbs_station_date_covering');
        table.dropIndex([], 'idx_dbs_station_bay_date');
    });

    await knex.schema.table('stations', (table) => {
        table.dropIndex([], 'idx_stations_join_covering');
        table.dropIndex([], 'idx_stations_province_active_covering');
        table.dropIndex([], 'idx_stations_agency_active_covering');
        table.dropIndex([], 'idx_stations_ward_active_covering');
    });

    await knex.schema.table('agency', (table) => {
        table.dropIndex([], 'idx_agency_province_active_ward');
        table.dropIndex([], 'idx_agency_id_covering');
    });

    await knex.schema.table('wash_bays', (table) => {
        table.dropIndex([], 'idx_wash_bays_status_station');
    });

    console.log('✅ Join optimization indexes dropped successfully');
};
