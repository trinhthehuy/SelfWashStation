// Transaction.service.ts
import db from '../db/index.js';
import dayjs from 'dayjs';
import type { RequestScope } from '../middleware/auth.js';

export class TransService {
    async getTransactions(params: any) {
        const { 
            page = 1, 
            limit = 20, 
            station_id, 
            bay_id, 
            bay_code, 
            start_date, 
            end_date, 
            status, 
            agencyId, 
            scope,
            include_total = true
        } = params;
        const offset = (page - 1) * limit;
        const includeTotal = String(include_total) === 'true';

        const query = db('transactions as w')
            .leftJoin('stations as s', 'w.station_id', 's.id');

        // LOG ĐỂ BIẾT CHÍNH XÁC GIÁ TRỊ NHẬN VÀO
        console.log(">>> [Check Filter]:", { station_id, bay_id, bay_code, start_date, end_date });

        // Áp dụng scope bảo mật theo role
        const reqScope: RequestScope = scope || (agencyId != null ? { agencyId } : {});
        if (reqScope.agencyId != null) {
            query.where('s.agency_id', reqScope.agencyId);
        } else if (reqScope.provinceIds?.length) {
            query.whereIn('s.province_id', reqScope.provinceIds);
        } else if (reqScope.stationIds?.length) {
            query.whereIn('w.station_id', reqScope.stationIds);
        }

        if (station_id && station_id !== 'undefined' && station_id !== '') {
            query.where('w.station_id', station_id);
        }

        if (bay_code && bay_code !== 'undefined' && bay_code !== '') {
            query.where('w.bay_code', bay_code);
        } else if (bay_id && bay_id !== 'undefined' && bay_id !== '') {
            query.where('w.bay_id', bay_id);
        }

        if (status && status !== 'undefined' && status !== '') {
            query.where('w.status', status);
        }

        if (start_date && end_date) {
            query.whereBetween('w.created_at', [start_date, end_date]);
        }

        // IN CÂU SQL HOÀN CHỈNH ĐỂ COPY CHẠY THỬ TRONG DB
        console.log(">>> [FULL SQL]:", query.toString());

        const dataPromise = query.clone()
            .select('w.*', 's.station_name')
            .orderBy('w.created_at', 'desc')
            .limit(limit)
            .offset(offset);

        let totalPromise = null;
        if (includeTotal) {
            totalPromise = query.clone().count('w.id as total').first();
        }

        const [data, countResult] = await Promise.all([
            dataPromise,
            totalPromise
        ]);

        return {
            data: data || [],
            ...(includeTotal ? { total: Number(countResult?.total || 0) } : {}),
            page: Number(page),
            limit: Number(limit)
        };
    }

    async deleteTransaction(id: number, scope?: RequestScope | null) {
        const query = db('transactions').where('id', id);

        // Áp dụng scope bảo mật theo role
        if (scope?.agencyId) {
            // Cần join với bảng stations để kiểm tra agencyId
            const transaction = await db('transactions as w')
                .leftJoin('stations as s', 'w.station_id', 's.id')
                .where('w.id', id)
                .select('w.*', 's.agency_id')
                .first();

            if (!transaction || transaction.agency_id !== scope.agencyId) {
                throw new Error('Bạn không có quyền xóa phiên rửa này');
            }
        }

        const deleted = await query.del();
        if (!deleted) {
            throw new Error('Phiên rửa không tồn tại');
        }
        return true;
    }
}
