// revenue.service.ts
import db from '../db/index.js';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
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

        // Sử dụng daily_bay_summary để giảm 24 lần khối lượng tính toán
        let query = db('daily_bay_summary as dbs')
            .leftJoin('stations as s', 'dbs.station_id', 's.id')
            .leftJoin('agency as a', 's.agency_id', 'a.id')
            .leftJoin('wards as w', 's.ward_id', 'w.id')
            .leftJoin('provinces as p', 's.province_id', 'p.id');

        if (!groupByTimeOnly && level === 'agency') {
            query = query
                .leftJoin('provinces as ap', 'a.province_id', 'ap.id')
                .leftJoin('wards as aw', 'a.ward_id', 'aw.id');
        }

        let timeFormat = '%Y-%m-%d';
        if (time_unit === 'week') timeFormat = '%x-%v'; 
        if (time_unit === 'month') timeFormat = '%Y-%m'; 

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

        if (province_id) query.where('s.province_id', province_id);
        if (ward_id)     query.where('s.ward_id', ward_id);
        if (agency_id)   query.where('s.agency_id', agency_id);
        if (station_id)  query.where('dbs.station_id', station_id);
        if (bay_code)    query.where('dbs.bay_code', bay_code);

        const scoped_province_ids = params.scoped_province_ids as number[] | undefined;
        const scoped_station_ids  = params.scoped_station_ids  as number[] | undefined;
        if (scoped_province_ids?.length) query.whereIn('s.province_id', scoped_province_ids);
        if (scoped_station_ids?.length)  query.whereIn('dbs.station_id', scoped_station_ids);

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

        if (start_date && end_date) {
            query.whereBetween('dbs.summary_date', [start_date, end_date]);
        }

        const scopedAgencyId = agency_id ? Number(agency_id) : null;
        const applyScopeToStationAggregate = (subQuery: any, stationAlias: string) => {
            if (scopedAgencyId) subQuery.where(`${stationAlias}.agency_id`, scopedAgencyId);
            if (scoped_province_ids?.length) subQuery.whereIn(`${stationAlias}.province_id`, scoped_province_ids);
            if (scoped_station_ids?.length) subQuery.whereIn(`${stationAlias}.id`, scoped_station_ids);
        };

        if (!groupByTimeOnly && level === 'province') {
            const pcs = db('stations as s2').select('s2.province_id', db.raw('COUNT(*) as station_count'), db.raw('COUNT(DISTINCT s2.agency_id) as agency_count'), db.raw('COUNT(DISTINCT s2.ward_id) as ward_count')).where('s2.is_active', 1).groupBy('s2.province_id');
            applyScopeToStationAggregate(pcs, 's2');
            const pbs = db('wash_bays as wb2').join('stations as s3', 'wb2.station_id', 's3.id').select('s3.province_id', db.raw('COUNT(*) as bay_count')).where('wb2.bay_status', 1).where('s3.is_active', 1).groupBy('s3.province_id');
            applyScopeToStationAggregate(pbs, 's3');
            query.leftJoin(pcs.as('pcs'), 'pcs.province_id', 'p.id').leftJoin(pbs.as('pbs'), 'pbs.province_id', 'p.id');
            selectFields.push('p.province_name', db.raw('COALESCE(pcs.station_count, 0) as station_count'), db.raw('COALESCE(pcs.agency_count, 0) as agency_count'), db.raw('COALESCE(pcs.ward_count, 0) as ward_count'), db.raw('COALESCE(pbs.bay_count, 0) as bay_count'));
            groupByFields.push('p.id', 'p.province_name');
        } else if (!groupByTimeOnly && level === 'ward') {
            const wcs = db('stations as s2').select('s2.ward_id', db.raw('COUNT(*) as station_count'), db.raw('COUNT(DISTINCT s2.agency_id) as agency_count')).where('s2.is_active', 1).groupBy('s2.ward_id');
            applyScopeToStationAggregate(wcs, 's2');
            const wbs = db('wash_bays as wb2').join('stations as s3', 'wb2.station_id', 's3.id').select('s3.ward_id', db.raw('COUNT(*) as bay_count')).where('wb2.bay_status', 1).where('s3.is_active', 1).groupBy('s3.ward_id');
            applyScopeToStationAggregate(wbs, 's3');
            query.leftJoin(wcs.as('wcs'), 'wcs.ward_id', 'w.id').leftJoin(wbs.as('wbs'), 'wbs.ward_id', 'w.id');
            selectFields.push('p.province_name', 'w.ward_name', db.raw('COALESCE(wcs.agency_count, 0) as agency_count'), db.raw('COALESCE(wcs.station_count, 0) as station_count'), db.raw('COALESCE(wbs.bay_count, 0) as bay_count'));
            groupByFields.push('w.id', 'p.province_name', 'w.ward_name');
        } else if (!groupByTimeOnly && level === 'agency') {
            const acs = db('stations as s2').select('s2.agency_id', db.raw('COUNT(*) as station_count'), db.raw('COUNT(DISTINCT s2.ward_id) as ward_count')).where('s2.is_active', 1).groupBy('s2.agency_id');
            applyScopeToStationAggregate(acs, 's2');
            const abs = db('wash_bays as wb2').join('stations as s3', 'wb2.station_id', 's3.id').select('s3.agency_id', db.raw('COUNT(*) as bay_count')).where('wb2.bay_status', 1).where('s3.is_active', 1).groupBy('s3.agency_id');
            applyScopeToStationAggregate(abs, 's3');
            query.leftJoin(acs.as('acs'), 'acs.agency_id', 'a.id').leftJoin(abs.as('abs'), 'abs.agency_id', 'a.id');
            selectFields.push('a.agency_name', 'a.identity_number', 'ap.province_name', 'aw.ward_name', db.raw('COALESCE(acs.ward_count, 0) as ward_count'), db.raw('COALESCE(acs.station_count, 0) as station_count'), db.raw('COALESCE(abs.bay_count, 0) as bay_count'));
            groupByFields.push('a.id', 'a.agency_name', 'a.identity_number', 'ap.province_name', 'aw.ward_name');
        } else if (!groupByTimeOnly && level === 'station') {
            const sba = db('wash_bays as wb_s').select('wb_s.station_id', db.raw('COUNT(*) as bay_count')).where('wb_s.bay_status', 1).groupBy('wb_s.station_id');
            if (scoped_station_ids?.length) sba.whereIn('wb_s.station_id', scoped_station_ids);
            query.leftJoin(sba.as('sba'), 'sba.station_id', 's.id');
            selectFields.push('s.station_name as station_code', 'a.agency_name', 'p.province_name', 'w.ward_name', 's.address', db.raw('COALESCE(sba.bay_count, 0) as bay_count'));
            groupByFields.push('s.id', 's.station_name', 'a.agency_name', 'p.province_name', 'w.ward_name', 's.address');
        } else if (!groupByTimeOnly && level === 'bay') {
            selectFields.push('dbs.bay_code', 's.station_name as station_code', 'p.province_name', 'w.ward_name', 's.address');
            groupByFields.push('dbs.station_id', 'dbs.bay_code', 's.station_name', 'p.province_name', 'w.ward_name', 's.address');
        }

        const sortableFields = new Set(['Time', 'revenue', 'total_sessions', 'total_op_time', 'province_name', 'ward_name', 'agency_name', 'station_code', 'bay_code']);
        const sortBy = sortableFields.has(String(sort_by || '')) ? String(sort_by) : (aggregateByEntity || groupByTimeOnly ? 'revenue' : 'Time');
        const sortOrder = String(sort_order || '').toLowerCase() === 'asc' ? 'asc' : 'desc';

        try {
            const groupedBase = query.clone().select(selectFields).groupBy(groupByFields);
            let total = 0;
            if (includeTotal) {
                const countResult = await db.from(groupedBase.clone().as('count_table')).count({ total: '*' }).first();
                total = Number((countResult as any)?.total || 0);
            }
            const data = await groupedBase.clone().orderBy(sortBy, sortOrder).limit(Number(limit)).offset(offset);
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
            return { success: true, data: { list, ...(includeTotal ? { total } : {}) } };
        } catch (error) {
            console.error("RevenueReport Error:", error);
            throw error;
        }
    }

    async getHourlyReport(params: any, scope?: RequestScope | null) {
        const { start_date, end_date, station_id } = params;
        try {
            const query = db('hourly_bay_summary as dbs')
                .select('dbs.hour', db.raw('DAYOFWEEK(dbs.summary_date) as dow'), db.raw('SUM(dbs.total_amount) as revenue'), db.raw('SUM(dbs.total_transactions) as sessions'))
                .groupBy('dbs.hour', 'dow');
            if (start_date && end_date) query.whereBetween('dbs.summary_date', [start_date, end_date]);
            if (station_id) query.where('dbs.station_id', station_id);
            if (scope?.agencyId != null) query.join('stations as s', 'dbs.station_id', 's.id').where('s.agency_id', scope.agencyId);
            else if (scope?.provinceIds?.length) query.join('stations as s', 'dbs.station_id', 's.id').whereIn('s.province_id', scope.provinceIds);
            else if (scope?.stationIds?.length) query.whereIn('dbs.station_id', scope.stationIds);
            const rows = await query;
            return { success: true, data: rows.map((item: any) => ({ hour: Number(item.hour), dow: Number(item.dow), revenue: Number(item.revenue || 0), sessions: Number(item.sessions || 0) })) };
        } catch (error) {
            console.error("HourlyReport Error:", error);
            throw error;
        }
    }

    async getSystemStats(scope?: RequestScope | null) {
        try {
            const agencyId = scope?.agencyId ?? null;
            const provinceIds = scope?.provinceIds;
            const stationIds  = scope?.stationIds;

            const applySummaryScope = (q: any) => {
                if (agencyId != null) return q.join('stations as s', 'dbs.station_id', 's.id').where('s.agency_id', agencyId);
                else if (provinceIds?.length) return q.join('stations as s', 'dbs.station_id', 's.id').whereIn('s.province_id', provinceIds);
                else if (stationIds?.length) return q.whereIn('dbs.station_id', stationIds);
                return q;
            };

            let stationBaseScope = db('stations');
            if (agencyId != null) stationBaseScope = stationBaseScope.where('agency_id', agencyId);
            else if (provinceIds?.length) stationBaseScope = stationBaseScope.whereIn('province_id', provinceIds);
            else if (stationIds?.length) stationBaseScope = stationBaseScope.whereIn('id', stationIds);

            // Logic tính Doanh thu tháng này (Toàn bộ các ngày trong tháng hiện tại)
            const firstDayOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
            const lastDayOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');
            const firstDayOfPrevMonth = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
            const lastDayOfPrevMonth = dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD');

            const [
                agencyRow, stationStatusRow, bayRow,
                revenueThisRow, revenuePrevRow,
                trendRows,
                bayStatusRows
            ] = await Promise.all([
                db('agency').count('id as count').where(agencyId != null ? { id: agencyId } : { is_active: 1 }).first(),
                stationBaseScope.clone().select(db.raw('COUNT(*) as total_count'), db.raw('SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count')).first(),
                db('wash_bays').whereIn('station_id', stationBaseScope.clone().select('id')).count('id as count').first(),
                
                // Doanh thu tháng này
                applySummaryScope(db('daily_bay_summary as dbs')).select(db.raw('SUM(total_amount) as revenue'), db.raw('SUM(total_transactions) as sessions')).whereBetween('summary_date', [firstDayOfMonth, lastDayOfMonth]).first(),
                
                // Doanh thu tháng trước
                applySummaryScope(db('daily_bay_summary as dbs')).select(db.raw('SUM(total_amount) as revenue'), db.raw('SUM(total_transactions) as sessions')).whereBetween('summary_date', [firstDayOfPrevMonth, lastDayOfPrevMonth]).first(),
                
                // Trend 7 ngày cho Sparkline
                applySummaryScope(db('daily_bay_summary as dbs')).select('summary_date as day').sum('total_amount as revenue').sum('total_transactions as sessions').whereBetween('summary_date', [db.raw('DATE_SUB(CURDATE(), INTERVAL 7 DAY)'), db.raw('DATE_SUB(CURDATE(), INTERVAL 1 DAY)')]).groupBy('summary_date').orderBy('summary_date', 'asc'),

                // Trạng thái trụ (Active/Stopped)
                db('wash_bays')
                    .whereIn('station_id', stationBaseScope.clone().select('id'))
                    .select('bay_status as status', db.raw('COUNT(*) as count'))
                    .groupBy('bay_status')
            ]);

            const revenueTrend: number[] = [];
            const sessionsTrend: number[] = [];
            const today = new Date();
            for (let i = 7; i >= 1; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                const key = d.toISOString().split('T')[0];
                const found = (trendRows as any[]).find(r => dayjs(r.day).format('YYYY-MM-DD') === key);
                revenueTrend.push(Number(found?.revenue || 0));
                sessionsTrend.push(Number(found?.sessions || 0));
            }

            const revenueThis  = Number((revenueThisRow as any)?.revenue  || 0);
            const revenuePrev  = Number((revenuePrevRow as any)?.revenue  || 0);
            const sessionsThis = Number((revenueThisRow as any)?.sessions || 0);
            const sessionsPrev = Number((revenuePrevRow as any)?.sessions || 0);
            const calcPct = (cur: number, prev: number) => prev > 0 ? Math.round(((cur - prev) / prev) * 100 * 10) / 10 : null;

            // Mapping bay_status to array format expected by frontend
            const bayStatus = (bayStatusRows as any[]).map(r => ({
                status: Number(r.status),
                count: Number(r.count)
            }));

            // Tạm thời giả định giá trị tháng trước bằng hiện tại nếu không có lịch sử trạng thái
            const stationCount = Number((stationStatusRow as any)?.active_count || 0);
            const currentBayOnline = bayStatus.find(s => s.status === 1)?.count || 0;

            return { 
                success: true, 
                data: { 
                    agency_count: Number((agencyRow as any)?.count || 0), 
                    station_count: stationCount, 
                    station_total_count: Number((stationStatusRow as any)?.total_count || 0), 
                    bay_count: Number((bayRow as any)?.count || 0), 
                    revenue_this_month: revenueThis, 
                    sessions_this_month: sessionsThis, 
                    revenue_pct_change: calcPct(revenueThis, revenuePrev), 
                    sessions_pct_change: calcPct(sessionsThis, sessionsPrev), 
                    revenue_trend_7d: revenueTrend, 
                    sessions_trend_7d: sessionsTrend,
                    bay_status: bayStatus,
                    station_count_prev: stationCount, // Placeholder
                    bay_online_prev: currentBayOnline // Placeholder
                } 
            };
        } catch (error) {
            console.error("SystemStats Error:", error);
            throw error;
        }
    }

    async getStationRevenuePie(topN = 6, scope?: RequestScope | null) {
        try {
            const query = db('daily_bay_summary as dbs').join('stations as s', 'dbs.station_id', 's.id').select('s.id as station_id', 's.station_name as name').sum('dbs.total_amount as revenue').whereBetween('dbs.summary_date', [db.raw('DATE_SUB(CURDATE(), INTERVAL 30 DAY)'), db.raw('DATE_SUB(CURDATE(), INTERVAL 1 DAY)')]).groupBy('s.id', 's.station_name').orderBy('revenue', 'desc');
            if (scope?.agencyId != null) query.where('s.agency_id', scope.agencyId);
            else if (scope?.provinceIds?.length) query.whereIn('s.province_id', scope.provinceIds);
            else if (scope?.stationIds?.length) query.whereIn('s.id', scope.stationIds);
            const rows = await query;
            const top = rows.slice(0, topN);
            const others = rows.slice(topN);
            const othersRevenue = others.reduce((s: number, r: any) => s + Number(r.revenue || 0), 0);
            const result = top.map((r: any) => ({ name: r.name, revenue: Number(r.revenue || 0) }));
            if (othersRevenue > 0) result.push({ name: 'Các trạm còn lại', revenue: othersRevenue });
            return { success: true, data: { items: result, total: result.reduce((s, r) => s + r.revenue, 0) } };
        } catch (error) {
            console.error('StationRevenuePie Error:', error);
            throw error;
        }
    }

    async exportRevenueReport(params: any, scope?: RequestScope | null): Promise<Buffer> {
        const {
            level = 'province',
            time_unit = 'day',
            start_date,
            end_date,
            keyword,
            province_id,
            ward_id,
            agency_id,
            station_id,
            bay_code,
        } = params;

        // Reuse the same query logic as getRevenueReport but fetch ALL rows (no pagination)
        const exportParams = {
            ...params,
            page: 1,
            limit: 100_000,
            include_total: false,
            ...(scope?.agencyId != null && { agency_id: scope.agencyId }),
            ...(scope?.provinceIds?.length && { scoped_province_ids: scope.provinceIds }),
            ...(scope?.stationIds?.length && { scoped_station_ids: scope.stationIds }),
        };

        const { data } = await this.getRevenueReport(exportParams);
        const rows: any[] = data.list;

        const levelLabels: Record<string, string> = {
            province: 'Tỉnh/Thành phố',
            ward: 'Quận/Huyện',
            agency: 'Đại lý',
            station: 'Trạm',
            bay: 'Trụ rửa',
        };

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'SelfWashStation';
        const sheet = workbook.addWorksheet('Doanh thu', { views: [{ state: 'frozen', ySplit: 1 }] });

        // --- Build columns dynamically by level ---
        const baseCols: Partial<ExcelJS.Column>[] = [
            { header: 'Thời gian', key: 'Time', width: 14 },
            { header: 'Doanh thu (đ)', key: 'revenue', width: 18, style: { numFmt: '#,##0' } },
            { header: 'Số lượt rửa', key: 'total_sessions', width: 14, style: { numFmt: '#,##0' } },
            { header: 'Thời gian vận hành (s)', key: 'total_op_time', width: 22, style: { numFmt: '#,##0' } },
        ];

        const entityCols: Record<string, Partial<ExcelJS.Column>[]> = {
            province: [
                { header: 'Tỉnh/Thành phố', key: 'province_name', width: 20 },
                { header: 'Số đại lý', key: 'agency_count', width: 12 },
                { header: 'Số trạm', key: 'station_count', width: 12 },
                { header: 'Số trụ', key: 'bay_count', width: 10 },
            ],
            ward: [
                { header: 'Tỉnh/Thành phố', key: 'province_name', width: 20 },
                { header: 'Quận/Huyện', key: 'ward_name', width: 20 },
                { header: 'Số trạm', key: 'station_count', width: 12 },
                { header: 'Số trụ', key: 'bay_count', width: 10 },
            ],
            agency: [
                { header: 'Tên đại lý', key: 'agency_name', width: 24 },
                { header: 'MST', key: 'identity_number', width: 16 },
                { header: 'Tỉnh/Thành phố', key: 'province_name', width: 20 },
                { header: 'Số trạm', key: 'station_count', width: 12 },
                { header: 'Số trụ', key: 'bay_count', width: 10 },
            ],
            station: [
                { header: 'Tên trạm', key: 'station_code', width: 24 },
                { header: 'Đại lý', key: 'agency_name', width: 24 },
                { header: 'Tỉnh/Thành phố', key: 'province_name', width: 20 },
                { header: 'Quận/Huyện', key: 'ward_name', width: 20 },
                { header: 'Địa chỉ', key: 'address', width: 30 },
                { header: 'Số trụ', key: 'bay_count', width: 10 },
            ],
            bay: [
                { header: 'Mã trụ', key: 'bay_code', width: 14 },
                { header: 'Tên trạm', key: 'station_code', width: 24 },
                { header: 'Tỉnh/Thành phố', key: 'province_name', width: 20 },
                { header: 'Địa chỉ', key: 'address', width: 30 },
            ],
        };

        sheet.columns = [...(entityCols[level] ?? []), ...baseCols];

        // Header row styling
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 20;

        // Data rows
        for (const row of rows) {
            sheet.addRow(row);
        }

        // Alternate row shading
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.eachCell((cell) => {
                    cell.alignment = { vertical: 'middle' };
                    if (rowNumber % 2 === 0) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                    }
                });
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
}
