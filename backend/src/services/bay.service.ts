// bay.service.ts
import db from '../db/index.js';
import type { RequestScope } from '../middleware/auth.js';

export class BayService {
    
    async generateNextBayCode(stationId: number): Promise<string> {
        const lastBay = await db('wash_bays')
            .where('station_id', stationId)
            .andWhereRaw('LENGTH(bay_code) = 4') // "BY" + "xx"
            .orderBy('bay_code', 'desc')
            .first();

        let nextNumber = 1;

        if (lastBay && lastBay.bay_code) {
            const lastNumberString = lastBay.bay_code.substring(2);
            const lastNumber = parseInt(lastNumberString);
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }

        if (nextNumber > 99) {
            throw new Error("Trạm này đã đạt giới hạn tối đa 99 trụ.");
        }

        return `BY${nextNumber.toString().padStart(2, '0')}`;
    }

    async getBays(stationId?: number | string, scope?: RequestScope | null) {
      const query = db('wash_bays as w')
        .select(
          's.station_name',
          'w.*'
        )
        .leftJoin('stations as s', 'w.station_id', 's.id');

      // Nếu có stationId thì mới thêm điều kiện WHERE
      if (stationId) {
        query.where('w.station_id', stationId);
      }

      if (scope?.agencyId) {
        query.andWhere('s.agency_id', scope.agencyId);
      } else if (scope?.provinceIds?.length) {
        query.whereIn('s.province_id', scope.provinceIds);
      } else if (scope?.stationIds?.length) {
        query.whereIn('w.station_id', scope.stationIds);
      }

      return await query;
    }

  /**
     * Tạo Bay mới
     */
    async createBay(stationId: number, scope?: RequestScope | null) {
      if (scope?.agencyId) {
        const station = await db('stations').where('id', stationId).andWhere('agency_id', scope.agencyId).first();
        if (!station) {
          throw new Error('Bạn không có quyền thao tác trạm này');
        }
      } else if (scope?.provinceIds?.length) {
        const station = await db('stations').where('id', stationId).whereIn('province_id', scope.provinceIds).first();
        if (!station) {
          throw new Error('Bạn không có quyền thao tác trạm này');
        }
      } else if (scope?.stationIds?.length) {
        if (!scope.stationIds.includes(stationId)) {
          throw new Error('Bạn không có quyền thao tác trạm này');
        }
      }

      const newBayCode = await this.generateNextBayCode(stationId);
      const [id] = await db('wash_bays').insert({
          station_id: stationId,
          bay_code: newBayCode,
          bay_status: 1, // 1: Hoạt động 
          created_at: new Date(),
          updated_at: new Date()
      });
    // Trả về toàn bộ thông tin để Frontend có ID và ngày tạo để dùng ngay
      return { id, bay_code: newBayCode, station_id: stationId };
    }
  
    /**
     * Cập nhật thông tin bay dựa trên ID. Frontend sẽ gửi lên những trường cần cập nhật, không bắt buộc phải đầy đủ tất cả trường
     */
    async updateBay(id: number, data: any, scope?: RequestScope | null) {
      const query = db('wash_bays as w').where('w.id', id);
      if (scope?.agencyId) {
        query.join('stations as s', 'w.station_id', 's.id').andWhere('s.agency_id', scope.agencyId);
      } else if (scope?.provinceIds?.length) {
        query.join('stations as s', 'w.station_id', 's.id').whereIn('s.province_id', scope.provinceIds);
      } else if (scope?.stationIds?.length) {
        query.whereIn('w.station_id', scope.stationIds);
      }

      // Thực hiện update dựa trên ID
      await query
        .update({
          ...data,
          updated_at: db.fn.now() // Cập nhật thời gian chỉnh sửa
        });
  
      // Trả về dữ liệu mới nhất sau khi sửa để Frontend đồng bộ
      return await db('wash_bays').where('id', id).first();
    }
  
    // bay.service.js
  async deleteBay(id: number, scope?: RequestScope | null) {
    // 1. Kiểm tra Trụ rửa có tồn tại không trước khi xóa
    const bayQuery = db('wash_bays as w').select('w.*').where('w.id', id);
    if (scope?.agencyId) {
      bayQuery.join('stations as s', 'w.station_id', 's.id').andWhere('s.agency_id', scope.agencyId);
    } else if (scope?.provinceIds?.length) {
      bayQuery.join('stations as s', 'w.station_id', 's.id').whereIn('s.province_id', scope.provinceIds);
    } else if (scope?.stationIds?.length) {
      bayQuery.whereIn('w.station_id', scope.stationIds);
    }

    const bay = await bayQuery.first();
    if (!bay) {
      throw new Error('Trụ rửa không tồn tại');
    }
    // 2. Thực hiện xóa
    const deleteQuery = db('wash_bays').where('id', id);
    const result = await deleteQuery.del();  
    return result;
  }
}