// ward.service.ts
import db from '../db/index.js';

export class WardService {
  async getProvinces() {
    return db('provinces').select('id', 'province_name', 'province_code').orderBy('province_name', 'asc');
  }
  /**
   * Lấy danh sách huyện/xã dựa trên province_id
   */
  async getWardsByProvince(provinceId?: number | string, keyword?: string, limit?: number) {
    console.log(`[WARD SERVICE] 🔍 Bắt đầu truy vấn Wards. Tham số đầu vào provinceId:`, provinceId);
    const query = db('wards as w')
      .select(
        'w.id',
        'w.ward_name'
      );

    // Nếu có truyền provinceId thì mới lọc
    if (provinceId) {
      query.where('w.province_id', provinceId);
    }
    
    // Lọc theo từ khóa (nếu có)
    if (keyword && keyword.trim() !== '') {
      query.where('w.ward_name', 'like', `%${keyword.trim()}%`);
    }

    // Giới hạn số lượng (nếu có)
    if (limit && limit > 0) {
      query.limit(limit);
    }
    
    const wards = await query;
    // Log kết quả trả về từ DB
      console.log(`[WARD SERVICE] ✅ Truy vấn Database hoàn tất.`);
      console.log(`[WARD SERVICE] 📊 Số lượng bản ghi tìm thấy: ${wards.length}`);

      if (wards.length > 0) {          
      }
    return wards;
  }
}