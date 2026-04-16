// strategy.service.ts
import db from '../db/index.js';

export class StrategyService {
  /**
   * Lấy danh sách chiến lược
   */
  async getStrategies(agencyId?: number | string) {
    const query = db('strategy as s')
      .select(
        'a.agency_name',
        'a.identity_number',
        's.*'        
      )
      .leftJoin('agency as a', 's.agency_id', 'a.id')

    // Nếu có truyền agencyId thì mới lọc, tránh load thừa dữ liệu
    if (agencyId) {
      query.where('s.agency_id', agencyId);
    }
    
    const strategies = await query;
    return strategies;
  }

  async createStrategy(data: any, scopedAgencyId?: number | null) {
      const payload = {
        ...data,
        agency_id: scopedAgencyId || data.agency_id
      };
      const [newId] = await db('strategy').insert(payload);
    // Trả về toàn bộ thông tin để Frontend có ID và ngày tạo để dùng ngay
      return await db('strategy').where('id', newId).first();
    }
  
    async updateStrategy(id: number, data: any, scopedAgencyId?: number | null) {
      const query = db('strategy').where('id', id);
      if (scopedAgencyId) {
        query.andWhere('agency_id', scopedAgencyId);
      }

      // Thực hiện update dựa trên ID
      await query
        .update({
          ...data,
          updated_at: db.fn.now() // Cập nhật thời gian chỉnh sửa
        });
  
      return await db('strategy').where('id', id).first();
    }
  
    // Strategy.service.js
  async deleteStrategy(id: number, scopedAgencyId?: number | null) {
    // 1. Kiểm tra Chiến lược có tồn tại không trước khi xóa
    const strategyQuery = db('strategy').where('id', id);
    if (scopedAgencyId) {
      strategyQuery.andWhere('agency_id', scopedAgencyId);
    }

    const Strategy = await strategyQuery.first();
    if (!Strategy) {
      throw new Error('Chiến lược không tồn tại');
    }
    // 2. Thực hiện xóa
    const deleteQuery = db('strategy').where('id', id);
    if (scopedAgencyId) {
      deleteQuery.andWhere('agency_id', scopedAgencyId);
    }

    const result = await deleteQuery.del();  
    return result;
  }
}