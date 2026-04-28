// agency.service.ts
import db from '../db/index.js';
import bcrypt from 'bcryptjs';
import type { RequestScope } from '../middleware/auth.js';

function normalizeAgencyEmail(value: unknown): string | null {
  const email = String(value || '').trim().toLowerCase();
  if (!email) {
    throw new Error('Email đại lý là bắt buộc');
  }

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!valid) {
    throw new Error('Email đại lý không hợp lệ');
  }

  return email;
}

export class AgencyService {
  /**
   * Lấy danh sách đại lý (Tổng hợp từ các hàm cũ)
   * Xử lý 3 trường hợp: Tất cả | Theo Tỉnh | Theo Xã
   */
  async getAgencies(
    filters: { ward_id?: number | string; province_id?: number | string; keyword?: string; limit?: number } = {},
    scope?: RequestScope | null
  ) {
    const { ward_id, province_id, keyword, limit } = filters;

    // 1. Khởi tạo query với các Join cần thiết để lấy đầy đủ thông tin
    const query = db('agency as a')
      .select(
        'p.province_name',
        'w.ward_name',
        'a.*'
      )
      .leftJoin('provinces as p', 'a.province_id', 'p.id')
      .leftJoin('wards as w', 'a.ward_id', 'w.id');

    // 2. Áp dụng scope bảo mật theo role
    if (scope?.role === 'agency') {
      // Bắt buộc chỉ xem đúng đại lý của mình, kể cả khi agencyId là null (thì sẽ không thấy gì)
      query.where('a.id', scope.agencyId || 0);
    } else if (scope?.role === 'regional_manager' && (scope?.provinceIds?.length || 0) > 0) {
      const provinceIds = scope.provinceIds as number[];
      query.whereIn('a.province_id', provinceIds);
      if (ward_id) query.andWhere('a.ward_id', ward_id);
    } else if (scope?.agencyId) {
      // Trường hợp sa/engineer chọn xem một đại lý cụ thể qua UI filter hoặc tham số
      query.where('a.id', scope.agencyId);
    } else {
      // sa / engineer / default — lọc theo UI filter bình thường (tất cả)
      if (ward_id) {
        query.where('a.ward_id', ward_id);
      } else if (province_id) {
        query.where('a.province_id', province_id);
      }
    }

    // 3. Lọc theo từ khóa (nếu có)
    if (keyword && keyword.trim() !== '') {
      const searchKey = `%${keyword.trim()}%`;
      query.where(function() {
        this.where('a.agency_name', 'like', searchKey)
            .orWhere('a.identity_number', 'like', searchKey);
      });
    }
    
    // 4. Giới hạn số lượng (nếu có)
    if (limit && limit > 0) {
      query.limit(limit);
    } else if (keyword && keyword.trim() !== '') {
      // Nếu có search keyword mà không có limit, mặc định limit để tránh trả về quá nhiều
      query.limit(1000);
    }

    try {
      const agencies = await query;
      return agencies;
    } catch (error) {
      console.error(`[AGENCY SERVICE] ❌ Lỗi DB:`, error);
      throw error;
    }
  }
  /**
   * Nếu accountData được cung cấp ({ password }), tạo tài khoản system_users kèm theo
   * trong cùng một transaction. Rollback toàn bộ nếu email đã tồn tại.
   */
  async createAgency(data: any, accountData?: { password: string } | null) {
    // Kiểm tra CCCD trước khi tạo
    if (data.identity_number) {
      const existingAgency = await db('agency').where('identity_number', data.identity_number).first();
      if (existingAgency) {
        throw new Error('Số CCCD / ID này đã được sử dụng bởi một đại lý khác');
      }
    }

    if (!accountData) {
      const [newId] = await db('agency').insert(data);
      return await db('agency').where('id', newId).first();
    }

    // Kiểm tra email trước để trả lỗi rõ ràng, trước khi mở transaction
    const agencyEmail = normalizeAgencyEmail(data.email);
    const existingUser = await db('system_users').where('email', agencyEmail).first();
    if (existingUser) {
      throw new Error('Email này đã được sử dụng cho một tài khoản khác');
    }

    return await db.transaction(async (trx) => {
      const [newAgencyId] = await trx('agency').insert(data);
      const agency = await trx('agency').where('id', newAgencyId).first();

      const agencyEmail = normalizeAgencyEmail(data.email);
      const passwordHash = await bcrypt.hash(accountData.password, 10);
      await trx('system_users').insert({
        email: agencyEmail,
        password_hash: passwordHash,
        full_name: data.agency_name,
        role: 'agency',
        agency_id: newAgencyId,
        is_active: true,
        must_change_password: true,
      });

      return { ...agency, createdAccount: { email: agencyEmail } };
    });
  }
  
    /**
     * Cập nhật thông tin đại lý
     */
    async updateAgency(id: number, data: any, scope?: RequestScope | null) {
      // Kiểm tra CCCD không bị trùng với đại lý khác
      if (data.identity_number) {
        const existingAgency = await db('agency')
          .where('identity_number', data.identity_number)
          .andWhere('id', '!=', id)
          .first();
        if (existingAgency) {
          throw new Error('Số CCCD / ID này đã được sử dụng bởi một đại lý khác');
        }
      }

      await db.transaction(async (trx) => {
        const query = trx('agency').where('id', id);

        if (scope?.role === 'agency') {
          query.andWhere('id', scope.agencyId || 0);
        } else if (scope?.provinceIds?.length) {
          query.whereIn('province_id', scope.provinceIds);
        } else if (scope?.agencyId) {
          query.andWhere('id', scope.agencyId);
        }

        await query.update({
          ...data,
          updated_at: trx.fn.now(),
        });

        if (Object.prototype.hasOwnProperty.call(data, 'email')) {
          const syncedEmail = normalizeAgencyEmail(data.email);
          await trx('system_users')
            .where('agency_id', id)
            .andWhere('role', 'agency')
            .update({
              email: syncedEmail,
              updated_at: trx.fn.now(),
            });
        }
      });

      // Trả về dữ liệu mới nhất sau khi sửa để Frontend đồng bộ
      return await db('agency').where('id', id).first();
    }
  
    // agency.service.js
  async deleteAgency(id: number, scope?: RequestScope | null) {
    // 1. Kiểm tra đại lý có tồn tại không trước khi xóa
    const agencyQuery = db('agency').where('id', id);
    if (scope?.role === 'agency') {
      agencyQuery.andWhere('id', scope.agencyId || 0);
    } else if (scope?.provinceIds?.length) {
      agencyQuery.whereIn('province_id', scope.provinceIds);
    } else if (scope?.agencyId) {
      agencyQuery.andWhere('id', scope.agencyId);
    }

    const agency = await agencyQuery.first();
    if (!agency) {
      throw new Error('Đại lý không tồn tại');
    }
    // 2. Thực hiện xóa
    await db('agency').where('id', id).del();  
    return agency;
  }
}
