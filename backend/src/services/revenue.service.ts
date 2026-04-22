import db from '../db/index.js';
import type { RequestScope } from '../middleware/auth.js';

export class RevenueService {
    async getRevenueReport(params: any) {
        const { 
            level = 'province', 
            time_unit = 'day', 
            start_date, 
            end_date, 
            keyword,
            page = 1,      
            limit = 20,
            sort_by,
            sort_order,
            aggregate_by_entity,
            group_by_time_only,
            include_total,
            // Các tham số lọc mới bổ sung
            province_id,
            ward_id,
            agency_id,
            station_id,
            bay_code
        } = params;

        const offset = (Number(page) - 1) * Number(limit);

        const asBool = (v: unknown, defaultValue = false) => {
            if (v === undefined || v === null) return defaultValue;
            if (typeof v === 'boolean') return v;
            if (typeof v === 'number') return v !== 0;
            const s = String(v).trim().toLowerCase();
            return s === 'true' || s === '1' || s === 'yes';
        };

        const aggregateByEntity = asBool(aggregate_by_entity, false);
        const groupByTimeOnly = asBool(group_by_time_only, false);
        const includeTotal = asBool(include_total, true);

        // 1. Khởi tạo Query chính
        let query = db('daily_bay_summary as dbs')
            .leftJoin('stations as s', 'dbs.station_id', 's.id')
            .leftJoin('agency as a', 's.agency_id', 'a.id')
            .leftJoin('wards as w', 's.ward_id', 'w.id') 
            .leftJoin('provinces as p', 's.province_id', 'p.id')
            .leftJoin('provinces as ap', 'a.province_id', 'ap.id')
            .leftJoin('wards as aw', 'a.ward_id', 'aw.id');

        // 2. Thiết lập định dạng thời gian
        let timeFormat = '%Y-%m-%d';
        if (time_unit === 'week') timeFormat = '%x-%v'; 
        if (time_unit === 'month') timeFormat = '%Y-%m'; 

        // 3. Xử lý Select và GROUP BY mặc định
        const selectFields: any[] = [
            db.raw('SUM(dbs.total_transactions) as total_sessions'),
            db.raw('SUM(dbs.total_amount) as revenue'),
            db.raw('SUM(dbs.total_op_time) as total_op_time')
        ];
        const groupByFields: any[] = [];

        if (!aggregateByEntity) {
            selectFields.unshift(db.raw(`DATE_FORMAT(dbs.summary_date, '${timeFormat}') as Time`));
            groupByFields.push(db.raw(`DATE_FORMAT(dbs.summary_date, '${timeFormat}')`));
        }

        // 4. Lọc theo các ID cụ thể (Bổ sung mới)
        if (province_id) query.where('p.id', province_id);
        if (ward_id) query.where('w.id', ward_id);
        if (agency_id) query.where('a.id', agency_id);
        if (station_id) query.where('s.id', station_id);
        if (bay_code) query.where('dbs.bay_code', bay_code);

        // 4b. Áp dụng scope bắt buộc theo role (ghi đè filter UI)
        const scoped_province_ids = params.scoped_province_ids as number[] | undefined;
        const scoped_station_ids  = params.scoped_station_ids  as number[] | undefined;
        if (scoped_province_ids?.length) query.whereIn('s.province_id', scoped_province_ids);
        if (scoped_station_ids?.length)  query.whereIn('s.id', scoped_station_ids);

        // 5. Lọc theo Keyword dựa trên Level
        if (keyword && keyword.trim() !== '') {
            const searchKey = `%${keyword.trim()}%`;
            query.where(function() {
                if (level === 'province') this.where('p.province_name', 'like', searchKey);
                else if (level === 'ward') this.where('w.ward_name', 'like', searchKey);
                else if (level === 'agency') this.where('a.agency_name', 'like', searchKey);
                else if (level === 'station') this.where('s.station_name', 'like', searchKey);
                else if (level === 'bay') this.where('dbs.bay_code', 'like', searchKey);
            });
        }

        // 6. Lọc theo khoảng thời gian
        if (start_date && end_date) {
            query.whereBetween('dbs.summary_date', [start_date, end_date]);
        }

        // 7. Bổ sung các trường select và group theo level
        const scopedAgencyId = agency_id ? Number(agency_id) : null;
        const applyScopeToStationAggregate = (subQuery: any, stationAlias: string) => {
            if (scopedAgencyId) {
                subQuery.where(`${stationAlias}.agency_id`, scopedAgencyId);
            }
            if (scoped_province_ids?.length) {
                subQuery.whereIn(`${stationAlias}.province_id`, scoped_province_ids);
            }
            if (scoped_station_ids?.length) {
                subQuery.whereIn(`${stationAlias}.id`, scoped_station_ids);
            }
        };

        if (!groupByTimeOnly && level === 'province') {
            const provinceStationAgg = db('stations as s2')
                .select(
                    's2.province_id',
                    db.raw('COUNT(*) as station_count'),
                    db.raw('COUNT(DISTINCT s2.agency_id) as agency_count'),
                    db.raw('COUNT(DISTINCT s2.ward_id) as ward_count')
                )
                .where('s2.is_active', 1)
                .groupBy('s2.province_id');

            applyScopeToStationAggregate(provinceStationAgg, 's2');

            const provinceBayAgg = db('wash_bays as wb2')
                .join('stations as s3', 'wb2.station_id', 's3.id')
                .select('s3.province_id', db.raw('COUNT(*) as bay_count'))
                .where('wb2.bay_status', 1)
                .where('s3.is_active', 1)
                .groupBy('s3.province_id');

            applyScopeToStationAggregate(provinceBayAgg, 's3');

            query
                .leftJoin(provinceStationAgg.as('pcs'), 'pcs.province_id', 'p.id')
                .leftJoin(provinceBayAgg.as('pbs'), 'pbs.province_id', 'p.id');

            selectFields.push(
                'p.province_name',
                db.raw('COALESCE(pcs.station_count, 0) as station_count'),
                db.raw('COALESCE(pcs.agency_count, 0) as agency_count'),
                db.raw('COALESCE(pcs.ward_count, 0) as ward_count'),
                db.raw('COALESCE(pbs.bay_count, 0) as bay_count')
            );
            groupByFields.push('p.id', 'p.province_name');
        } else if (!groupByTimeOnly && level === 'ward') {
            const wardStationAgg = db('stations as s2')
                .select(
                    's2.ward_id',
                    db.raw('COUNT(*) as station_count'),
                    db.raw('COUNT(DISTINCT s2.agency_id) as agency_count')
                )
                .where('s2.is_active', 1)
                .groupBy('s2.ward_id');

            applyScopeToStationAggregate(wardStationAgg, 's2');

            const wardBayAgg = db('wash_bays as wb2')
                .join('stations as s3', 'wb2.station_id', 's3.id')
                .select('s3.ward_id', db.raw('COUNT(*) as bay_count'))
                .where('wb2.bay_status', 1)
                .where('s3.is_active', 1)
                .groupBy('s3.ward_id');

            applyScopeToStationAggregate(wardBayAgg, 's3');

            query
                .leftJoin(wardStationAgg.as('wcs'), 'wcs.ward_id', 'w.id')
                .leftJoin(wardBayAgg.as('wbs'), 'wbs.ward_id', 'w.id');

            selectFields.push(
                'p.province_name', 'w.ward_name',
                db.raw('COALESCE(wcs.agency_count, 0) as agency_count'),
                db.raw('COALESCE(wcs.station_count, 0) as station_count'),
                db.raw('COALESCE(wbs.bay_count, 0) as bay_count')
            );
            groupByFields.push('w.id', 'p.province_name', 'w.ward_name');
        } else if (!groupByTimeOnly && level === 'agency') {
            const agencyStationAgg = db('stations as s2')
                .select(
                    's2.agency_id',
                    db.raw('COUNT(*) as station_count'),
                    db.raw('COUNT(DISTINCT s2.ward_id) as ward_count')
                )
                .where('s2.is_active', 1)
                .groupBy('s2.agency_id');

            applyScopeToStationAggregate(agencyStationAgg, 's2');

            const agencyBayAgg = db('wash_bays as wb2')
                .join('stations as s3', 'wb2.station_id', 's3.id')
                .select('s3.agency_id', db.raw('COUNT(*) as bay_count'))
                .where('wb2.bay_status', 1)
                .where('s3.is_active', 1)
                .groupBy('s3.agency_id');

            applyScopeToStationAggregate(agencyBayAgg, 's3');

            query
                .leftJoin(agencyStationAgg.as('acs'), 'acs.agency_id', 'a.id')
                .leftJoin(agencyBayAgg.as('abs'), 'abs.agency_id', 'a.id');

            selectFields.push(
                'a.agency_name',
                'a.identity_number',
                'ap.province_name',
                'aw.ward_name',
                db.raw('COALESCE(acs.ward_count, 0) as ward_count'),
                db.raw('COALESCE(acs.station_count, 0) as station_count'),
                db.raw('COALESCE(abs.bay_count, 0) as bay_count')
            );
            groupByFields.push('a.id', 'a.agency_name', 'a.identity_number', 'ap.province_name', 'aw.ward_name');
        } else if (!groupByTimeOnly && level === 'station') {
            selectFields.push('s.station_name as station_code', 'a.agency_name', 'p.province_name', 'w.ward_name', 's.address', db.raw('(SELECT COUNT(*) FROM wash_bays WHERE bay_status = 1 AND station_id = s.id) as bay_count'));
            groupByFields.push('s.id', 's.station_name', 'a.agency_name', 'p.province_name', 'w.ward_name', 's.address');
        } else if (!groupByTimeOnly && level === 'bay') {
            selectFields.push('dbs.bay_code', 's.station_name as station_code', 'p.province_name', 'w.ward_name', 's.address');
            groupByFields.push('dbs.station_id', 'dbs.bay_code', 's.station_name', 'p.province_name', 'w.ward_name', 's.address');
        }

        const sortableFields = new Set([
            'Time',
            'revenue',
            'total_sessions',
            'total_op_time',
            'province_name',
            'ward_name',
            'agency_name',
            'station_code',
            'bay_code'
        ]);
        const sortBy = sortableFields.has(String(sort_by || ''))
            ? String(sort_by)
            : (aggregateByEntity || groupByTimeOnly ? 'revenue' : 'Time');
        const sortOrder = String(sort_order || '').toLowerCase() === 'asc' ? 'asc' : 'desc';

        try {
            const groupedBase = query.clone().select(selectFields).groupBy(groupByFields);

            // 8. Lấy tổng số dòng bằng COUNT(*) trên subquery group
            let total = 0;
            if (includeTotal) {
                const countResult = await db
                    .from(groupedBase.clone().as('count_table'))
                    .count({ total: '*' })
                    .first();
                total = Number((countResult as any)?.total || 0);
            }

            // 9. Thực thi Query có phân trang
            const data = await groupedBase
                .clone()
                .orderBy(sortBy, sortOrder)
                .limit(Number(limit))
                .offset(offset);

            // 10. Map kết quả trả về
            const list = data.map((item: any) => ({
                ...item,
                total_sessions: Number(item.total_sessions || 0),
                revenue: Number(item.revenue || 0),
                total_op_time: Number(item.total_op_time || 0),
                ward_count: item.ward_count !== undefined ? Number(item.ward_count) : undefined,
                agency_count: item.agency_count !== undefined ? Number(item.agency_count) : undefined,
                station_count: item.station_count !== undefined ? Number(item.station_count) : undefined,
                bay_count: item.bay_count !== undefined ? Number(item.bay_count) : undefined,
                revenue_per_bay: item.bay_count > 0 ? Number(item.revenue) / item.bay_count : 0,
                sessions_per_bay: item.bay_count > 0 ? Math.round(Number(item.total_sessions) / item.bay_count) : 0,
            }));

            return {
                success: true,
                data: { list, total: includeTotal ? total : list.length }
            };
        } catch (error) {
            console.error("Database Error:", error);
            throw error;
        }
    }

    /**
     * Bảng tổng hợp doanh thu theo giờ trong ngày × ngày trong tuần
     * Dùng để vẽ heatmap "Doanh thu theo giờ"
     */
    async getHourlyReport(params: any, scope?: RequestScope | null) {
        const { start_date, end_date, station_id } = params;

        try {
            const query = db('transactions as t')
                .select(
                    db.raw('HOUR(COALESCE(t.transaction_time, t.created_at)) as hour'),
                    db.raw('DAYOFWEEK(COALESCE(t.transaction_time, t.created_at)) as dow'), // 1=Sun … 7=Sat
                    db.raw('SUM(t.amount) as revenue'),
                    db.raw('COUNT(t.id) as sessions')
                )
                .where('t.status', 'processed')
                .where('t.is_test', false)
                .groupByRaw(
                    'HOUR(COALESCE(t.transaction_time, t.created_at)), DAYOFWEEK(COALESCE(t.transaction_time, t.created_at))'
                );

            if (start_date && end_date) {
                const start = `${start_date} 00:00:00`;
                const endExclusive = db.raw('DATE_ADD(?, INTERVAL 1 DAY)', [end_date]);

                query.where(function (this: any) {
                    this.where(function (this: any) {
                        this.whereNotNull('t.transaction_time')
                            .where('t.transaction_time', '>=', start)
                            .where('t.transaction_time', '<', endExclusive);
                    }).orWhere(function (this: any) {
                        this.whereNull('t.transaction_time')
                            .where('t.created_at', '>=', start)
                            .where('t.created_at', '<', endExclusive);
                    });
                });
            }

            if (station_id) {
                query.where('t.station_id', station_id);
            }

            if (scope?.agencyId != null) {
                query.join('stations as s_scope', 't.station_id', 's_scope.id')
                     .where('s_scope.agency_id', scope.agencyId);
            } else if (scope?.provinceIds?.length) {
                query.join('stations as s_scope', 't.station_id', 's_scope.id')
                     .whereIn('s_scope.province_id', scope.provinceIds);
            } else if (scope?.stationIds?.length) {
                query.whereIn('t.station_id', scope.stationIds);
            }

            const rows = await query;

            const data = rows.map((item: any) => ({
                hour:     Number(item.hour),
                dow:      Number(item.dow),   // 1=Sun,2=Mon…7=Sat
                revenue:  Number(item.revenue  || 0),
                sessions: Number(item.sessions || 0)
            }));

            return { success: true, data };
        } catch (error) {
            console.error("HourlyReport Error:", error);
            throw error;
        }
    }

    /**
     * Thống kê tổng quan hệ thống: số đại lý, trạm, trụ, doanh thu tháng này + trend 7 ngày
     */
    async getSystemStats(scope?: RequestScope | null) {
        try {
            const agencyId = scope?.agencyId ?? null;
            const provinceIds = scope?.provinceIds;
            const stationIds  = scope?.stationIds;

            // Helper: apply scope to a transactions query
            const applyTxScope = (q: any) => {
                if (agencyId != null) {
                    return q.whereExists(
                        db('stations').select(db.raw('1'))
                            .whereRaw('stations.id = transactions.station_id')
                            .where('stations.agency_id', agencyId)
                    );
                } else if (provinceIds?.length) {
                    return q.whereExists(
                        db('stations').select(db.raw('1'))
                            .whereRaw('stations.id = transactions.station_id')
                            .whereIn('stations.province_id', provinceIds)
                    );
                } else if (stationIds?.length) {
                    return q.whereIn('station_id', stationIds);
                }
                return q;
            };

            // Helper: scoped stations base query for counting by station status column
            let stationBaseScope = db('stations');
            if (agencyId != null) stationBaseScope = stationBaseScope.where('agency_id', agencyId);
            else if (provinceIds?.length) stationBaseScope = stationBaseScope.whereIn('province_id', provinceIds);
            else if (stationIds?.length) stationBaseScope = stationBaseScope.whereIn('id', stationIds);

            // Helper: apply scope to a wash_bays query
            const buildBayScope = () => {
                const q = db('wash_bays');
                if (agencyId != null) {
                    return q.whereExists(
                        db('stations').select(db.raw('1'))
                            .whereRaw('stations.id = wash_bays.station_id')
                            .where('stations.agency_id', agencyId)
                    );
                } else if (provinceIds?.length) {
                    return q.whereExists(
                        db('stations').select(db.raw('1'))
                            .whereRaw('stations.id = wash_bays.station_id')
                            .whereIn('stations.province_id', provinceIds)
                    );
                } else if (stationIds?.length) {
                    return q.whereIn('station_id', stationIds);
                }
                return q;
            };
            const bayScope = buildBayScope();
            const agencyFilter = applyTxScope;

            const applyTxDateRange = (q: any, startDateExpr: string, endDateExpr: string) => {
                return q.where(function (this: any) {
                    this.where(function (this: any) {
                        this.whereNotNull('transaction_time')
                            .where('transaction_time', '>=', db.raw(startDateExpr))
                            .where('transaction_time', '<', db.raw(endDateExpr));
                    }).orWhere(function (this: any) {
                        this.whereNull('transaction_time')
                            .where('created_at', '>=', db.raw(startDateExpr))
                            .where('created_at', '<', db.raw(endDateExpr));
                    });
                });
            };

            const [
                [agencyRow], stationStatusRow, [bayRow],
                [revenueThisRow], [revenuePrevRow],
                trendRows, bayStatusRows,
                [stationPrevRow], [bayPrevRow]
            ] = await Promise.all([
                agencyId != null
                    ? db('agency').count('id as count').where('id', agencyId)
                    : db('agency').count('id as count').where('is_active', 1),
                stationBaseScope
                    .clone()
                    .select(
                        db.raw('COUNT(*) as total_count'),
                        db.raw('SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count')
                    )
                    .first(),
                bayScope.clone().count('id as count'),

                // Doanh thu + phiên 7 ngày gần nhất (D-7 đến D-1, không tính hôm nay)
                applyTxDateRange(
                    agencyFilter(db('transactions')
                    .select(db.raw('SUM(amount) as revenue'), db.raw('COUNT(id) as sessions'))
                    .where('status', 'processed').where('is_test', false)
                    ),
                    'DATE_SUB(CURDATE(), INTERVAL 7 DAY)',
                    'CURDATE()'
                ),

                // Cùng kỳ tháng trước
                applyTxDateRange(
                    agencyFilter(db('transactions')
                    .select(db.raw('SUM(amount) as revenue'), db.raw('COUNT(id) as sessions'))
                    .where('status', 'processed').where('is_test', false)
                    ),
                    'DATE_SUB(CURDATE(), INTERVAL 37 DAY)',
                    'DATE_SUB(CURDATE(), INTERVAL 30 DAY)'
                ),

                // Trend 7 ngày (D-7 đến D-1) cho sparkline
                applyTxDateRange(
                    agencyFilter(db('transactions')
                    .select(
                        db.raw('DATE(COALESCE(transaction_time, created_at)) as day'),
                        db.raw('SUM(amount) as revenue'),
                        db.raw('COUNT(id) as sessions')
                    )
                    .where('status', 'processed').where('is_test', false)
                    .groupBy(db.raw('DATE(COALESCE(transaction_time, created_at))'))
                    .orderBy('day', 'asc')
                    ),
                    'DATE_SUB(CURDATE(), INTERVAL 7 DAY)',
                    'CURDATE()'
                ),

                // Trạng thái trụ hiện tại
                bayScope.clone().select('bay_status').count('id as count').groupBy('bay_status'),

                // Số trạm cùng kỳ tháng trước
                stationBaseScope.clone().count('id as count')
                    .where('is_active', 1)
                    .whereRaw('created_at <= DATE_SUB(CURDATE(), INTERVAL 30 DAY)'),

                // Số trụ hoạt động cùng kỳ tháng trước (dựa vào bay_status)
                bayScope.clone().count('id as count')
                    .where('bay_status', 1)
                    .whereRaw('created_at <= DATE_SUB(CURDATE(), INTERVAL 30 DAY)')
            ]);

            // Build trend arrays đủ 7 ngày D-7 → D-1 (fill 0 cho ngày thiếu)
            const today = new Date();
            const revenueTrend: number[] = [];
            const sessionsTrend: number[] = [];
            for (let i = 7; i >= 1; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                const key = d.toISOString().split('T')[0];
                const found = (trendRows as any[]).find(r => r.day && r.day.toString().startsWith(key));
                revenueTrend.push(Number(found?.revenue || 0));
                sessionsTrend.push(Number(found?.sessions || 0));
            }

            const revenueThis  = Number(revenueThisRow?.revenue  || 0);
            const revenuePrev  = Number(revenuePrevRow?.revenue  || 0);
            const sessionsThis = Number(revenueThisRow?.sessions || 0);
            const sessionsPrev = Number(revenuePrevRow?.sessions || 0);

            const calcPct = (cur: number, prev: number) =>
                prev > 0 ? Math.round(((cur - prev) / prev) * 100 * 10) / 10 : null;

            return {
                success: true,
                data: {
                    agency_count:       Number(agencyRow.count   || 0),
                    station_count:      Number((stationStatusRow as any)?.active_count || 0),
                    station_total_count:Number((stationStatusRow as any)?.total_count || 0),
                    bay_count:          Number(bayRow.count      || 0),
                    revenue_this_month:  revenueThis,
                    sessions_this_month: sessionsThis,
                    revenue_pct_change:  calcPct(revenueThis,  revenuePrev),
                    sessions_pct_change: calcPct(sessionsThis, sessionsPrev),
                    revenue_trend_7d:    revenueTrend,
                    sessions_trend_7d:   sessionsTrend,
                    // Số trạm / trụ cùng kỳ tháng trước (để tính chênh lệch tuyệt đối)
                    station_count_prev: Number(stationPrevRow?.count || 0),
                    bay_online_prev:    Number(bayPrevRow?.count     || 0),
                    bay_status: (bayStatusRows as any[]).map(r => ({
                        status: Number(r.bay_status),
                        count:  Number(r.count)
                    }))
                }
            };
        } catch (error) {
            console.error("SystemStats Error:", error);
            throw error;
        }
    }

    /**
     * Doanh thu top-N trạm trong 30 ngày gần nhất (trừ hôm nay)
     * Trả về mảng [{name, revenue}] với phần tử cuối là "Các trạm còn lại"
     */
    async getStationRevenuePie(topN = 6, scope?: RequestScope | null) {
        try {
            const query = db('daily_bay_summary as dbs')
                .join('stations as s', 'dbs.station_id', 's.id')
                .select('s.id as station_id', 's.station_name as name')
                .sum('dbs.total_amount as revenue')
                .whereBetween('dbs.summary_date', [
                    db.raw('DATE_SUB(CURDATE(), INTERVAL 30 DAY)'),
                    db.raw('DATE_SUB(CURDATE(), INTERVAL 1 DAY)')
                ])
                .groupBy('s.id', 's.station_name')
                .orderBy('revenue', 'desc');

            if (scope?.agencyId != null) {
                query.where('s.agency_id', scope.agencyId);
            } else if (scope?.provinceIds?.length) {
                query.whereIn('s.province_id', scope.provinceIds);
            } else if (scope?.stationIds?.length) {
                query.whereIn('s.id', scope.stationIds);
            }

            const rows = await query;

            const top    = rows.slice(0, topN);
            const others = rows.slice(topN);

            const othersRevenue = others.reduce((s: number, r: any) => s + Number(r.revenue || 0), 0);

            const result: { name: string; revenue: number }[] = top.map((r: any) => ({
                name:    r.name,
                revenue: Number(r.revenue || 0)
            }));

            if (othersRevenue > 0) {
                result.push({ name: 'Các trạm còn lại', revenue: othersRevenue });
            }

            const total = result.reduce((s, r) => s + r.revenue, 0);

            return { success: true, data: { items: result, total } };
        } catch (error) {
            console.error('StationRevenuePie Error:', error);
            throw error;
        }
    }
}