// Transaction.service.ts
import db from '../db/index.js';
import dayjs from 'dayjs';
import type { RequestScope } from '../middleware/auth.js';

export class TransService {
    async getTransactions(params: any) {
        const { page = 1, limit = 20, station_id, bay_id, bay_code, start_date, end_date, status, agencyId, scope } = params;
        const offset = (page - 1) * limit;

        const query = db('transactions as w')
            .leftJoin('stations as s', 'w.station_id', 's.id');

        // LOG ĐỂ BIỮ CHÍNH XÁC GIÁ TRỊ NHẬN VÀO
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

        const [data, countResult] = await Promise.all([
            query.clone().select('w.*', 's.station_name').orderBy('w.created_at', 'desc').limit(limit).offset(offset),
            query.clone().count('w.id as total').first()
        ]);

        return {
            data: data || [],
            total: Number(countResult?.total || 0),
            page: Number(page),
            limit: Number(limit)
        };
    }
}