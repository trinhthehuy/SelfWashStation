// station.service.ts
import db from '../db/index.js';
import type { RequestScope } from '../middleware/auth.js';

type StationListFilters = {
  provinceId?: number;
  wardId?: number;
  agencyId?: number;
  stationId?: number;
};

export class StationService {
  private normalizeInitialBayCount(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 1;
    return Math.min(5, Math.max(1, Math.round(parsed)));
  }

  private buildStationListQuery(scope?: RequestScope | null, filters: StationListFilters = {}) {
    const query = db('stations as s')
      .select(
        's.*',
        'p.province_name',
        'w.ward_name',
        'a.agency_name',
        'b.account_number',
        'b.bank_name',
        'b.account_name',
        'st.amount_per_unit',
        'st.op_per_unit',
        'st.foam_per_unit',
      )
      .leftJoin('provinces as p', 's.province_id', 'p.id')
      .leftJoin('wards as w', 's.ward_id', 'w.id')
      .leftJoin('agency as a', 's.agency_id', 'a.id')
      .leftJoin('bank_account as b', 's.bank_account_id', 'b.id')
      .leftJoin('strategy as st', 's.strategy_id', 'st.id');

    if (filters.provinceId) {
      query.where('s.province_id', filters.provinceId);
    }
    if (filters.wardId) {
      query.where('s.ward_id', filters.wardId);
    }
    if (filters.agencyId) {
      query.where('s.agency_id', filters.agencyId);
    }
    if (filters.stationId) {
      query.where('s.id', filters.stationId);
    }

    if (scope?.agencyId) {
      query.where('s.agency_id', scope.agencyId);
    } else if (scope?.provinceIds?.length) {
      query.whereIn('s.province_id', scope.provinceIds);
    } else if (scope?.stationIds?.length) {
      query.whereIn('s.id', scope.stationIds);
    }

    return query;
  }

  /**
   * Lấy tất cả các trạm kèm thông tin Province, Ward và Agency liên quan
   */
  async getAllStations(scope?: RequestScope | null, filters: StationListFilters = {}) {
    const stations = await this.buildStationListQuery(scope, filters).orderBy('s.id', 'desc');

    return stations;
  }

  async getAllStationsPaginated(
    page: number,
    limit: number,
    scope?: RequestScope | null,
    filters: StationListFilters = {}
  ) {
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 20;
    const offset = (safePage - 1) * safeLimit;

    const baseQuery = this.buildStationListQuery(scope, filters);
    const countRows = await baseQuery.clone().clearSelect().clearOrder().count({ total: 's.id' });
    const total = Number(countRows[0]?.total ?? 0);

    const stations = await baseQuery
      .clone()
      .orderBy('s.id', 'desc')
      .limit(safeLimit)
      .offset(offset);

    return {
      data: stations,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    };
  }

  async getStationsByFilters(provinceId?: number, wardId?: number, agencyId?: number, scope?: RequestScope | null) {
    const query = db('stations as s')
      .select('s.id', 's.station_name')
      .orderBy('s.station_name', 'asc');

    // 1. Lọc theo Tỉnh (nếu có)
    if (provinceId) {
      query.where('s.province_id', provinceId);
    }

    // 2. Lọc theo Phường/Xã (nếu có)
    if (wardId) {
      query.where('s.ward_id', wardId);
    }

    // 3. Áp dụng scope bảo mật theo role
    if (scope?.agencyId) {
      query.where('s.agency_id', scope.agencyId);
    } else if (scope?.provinceIds?.length) {
      query.whereIn('s.province_id', scope.provinceIds);
    } else if (scope?.stationIds?.length) {
      query.whereIn('s.id', scope.stationIds);
    } else if (agencyId) {
      query.where('s.agency_id', agencyId);
    }

    const stations = await query;
    return stations;
  }
  
  async generateNextStationCode(provinceCode: string): Promise<string> {
    // 1. Tìm trạm cuối cùng có tên bắt đầu bằng mã tỉnh (ví dụ: 'NB%')
    const lastStation = await db('stations')
      .where('station_name', 'like', `${provinceCode}%`)
      .orderBy('station_name', 'desc')
      .first();

    let nextNumber = 1;

    if (lastStation && lastStation.station_name) {
      // Giả sử station_name có dạng "NB015"
      // Lấy 3 ký tự cuối và chuyển thành số
      const lastCode = lastStation.station_name;
      const lastNumberString = lastCode.replace(provinceCode, ''); // Loại bỏ chữ "NB"
      const lastNumber = parseInt(lastNumberString);
      
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // 2. Format số thứ tự thành 3 chữ số (001, 002...)
    const formattedNumber = String(nextNumber).padStart(3, '0');

    // 3. Trả về mã hoàn chỉnh (Ví dụ: NB016)
    return `${provinceCode}${formattedNumber}`;
}

  /**
   * Tạo trạm mới
   */
  async createStation(data: any, scope?: RequestScope | null) {
    const {
      initial_bay_count,
      ...stationData
    } = data || {};

    const payload = {
      ...stationData,
      agency_id: scope?.agencyId || stationData.agency_id
    };

    const bayCount = this.normalizeInitialBayCount(initial_bay_count);

    const createdStation = await db.transaction(async (trx) => {
      const [newId] = await trx('stations').insert(payload);

      const now = new Date();
      const bays = Array.from({ length: bayCount }, (_, index) => ({
        station_id: newId,
        bay_code: `BY${String(index + 1).padStart(2, '0')}`,
        bay_status: 1,
        created_at: now,
        updated_at: now
      }));

      await trx('wash_bays').insert(bays);

      return await trx('stations').where('id', newId).first();
    });

    // Trả về toàn bộ thông tin để Frontend có ID và ngày tạo để dùng ngay
    return createdStation;
  }

  /**
   * Cập nhật thông tin trạm
   */
  async updateStation(id: number, data: any, scope?: RequestScope | null) {
    const query = db('stations').where('id', id);
    if (scope?.agencyId) {
      query.andWhere('agency_id', scope.agencyId);
    } else if (scope?.provinceIds?.length) {
      query.whereIn('province_id', scope.provinceIds);
    } else if (scope?.stationIds?.length) {
      query.whereIn('id', scope.stationIds);
    }

    // Thực hiện update dựa trên ID
    await query
      .update({
        ...data,
        updated_at: db.fn.now() // Cập nhật thời gian chỉnh sửa
      });

    // Trả về dữ liệu mới nhất sau khi sửa để Frontend đồng bộ
    return await db('stations').where('id', id).first();
  }

  // station.service.js
async deleteStation(id: number, scope?: RequestScope | null) {
  // 1. Kiểm tra trạm có tồn tại không trước khi xóa
  const stationQuery = db('stations').where('id', id);
  if (scope?.agencyId) {
    stationQuery.andWhere('agency_id', scope.agencyId);
  } else if (scope?.provinceIds?.length) {
    stationQuery.whereIn('province_id', scope.provinceIds);
  } else if (scope?.stationIds?.length) {
    stationQuery.whereIn('id', scope.stationIds);
  }

  const station = await stationQuery.first();
  if (!station) {
    throw new Error('Trạm không tồn tại');
  }
  // 2. Thực hiện xóa
  const deleteQuery = db('stations').where('id', id);

  const result = await deleteQuery.del();  
  return result;
}

  /**
   * Gán chiến lược vận hành cho nhiều trạm cùng lúc
   */
  async assignStrategy(stationIds: number[], strategyId: number | null, scope?: RequestScope | null): Promise<number> {
    if (!stationIds || stationIds.length === 0) {
      throw new Error('Danh sách trạm không được rỗng');
    }

    const query = db('stations').whereIn('id', stationIds);
    if (scope?.agencyId) {
      query.andWhere('agency_id', scope.agencyId);
    } else if (scope?.provinceIds?.length) {
      query.whereIn('province_id', scope.provinceIds);
    } else if (scope?.stationIds?.length) {
      // Supervisor: cross-reference with their allowed stations
      query.whereIn('id', scope.stationIds);
    }

    const affected = await query.update({
      strategy_id: strategyId,
      updated_at: db.fn.now()
    });

    return affected;
  }
}