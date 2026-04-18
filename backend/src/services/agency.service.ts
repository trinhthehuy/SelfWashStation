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
    filters: { ward_id?: number | string; province_id?: number | string } = {},
    scope?: RequestScope | null
  ) {
    const { ward_id, province_id } = filters;

    // 1. Khởi tạo query với các Join cần thiết để lấy đầy đủ thông tin
    const query = db('agency as a')
      .select(
        'p.province_name',
        'w.ward_name',
        'a.*',
        db.raw(`su.avatar as user_avatar`)
      )
      .leftJoin('provinces as p', 'a.province_id', 'p.id')
      .leftJoin('wards as w', 'a.ward_id', 'w.id')
      .leftJoin('system_users as su', function() {
        this.on('su.agency_id', '=', 'a.id').andOn('su.role', '=', db.raw('?', ['agency']))
      });

    // 2. Áp dụng scope theo role trước, sau đó mới xét filter UI
    if (scope?.agencyId) {
      query.where('a.id', scope.agencyId);
    } else if (scope?.provinceIds?.length) {
      query.whereIn('a.province_id', scope.provinceIds);
      // Vẫn cho phép lọc thêm theo ward trong phạm vi province đã được scope
      if (ward_id) query.andWhere('a.ward_id', ward_id);
    } else {
      // sa / engineer — lọc theo UI filter bình thường
      if (ward_id) {
        query.where('a.ward_id', ward_id);
      } else if (province_id) {
        query.where('a.province_id', province_id);
      }
    }

    try {
      const agencies = await query;
      // Trả về avatar là user_avatar (từ system_users), không dùng agency.avatar nữa
      return agencies.map(a => ({
        ...a,
        avatar: a.user_avatar || null
      }));
    } catch (error) {
      console.error(`[AGENCY SERVICE] ❌ Lỗi DB:`, error);
      throw error;
    }
  }
  /**
   * Tạo đại lý mới.
   * Nếu accountData được cung cấp ({ username, password }), tạo tài khoản system_users kèm theo
   * trong cùng một transaction. Rollback toàn bộ nếu username đã tồn tại.
   */
  async createAgency(data: any, accountData?: { username: string; password: string } | null) {
    if (!accountData) {
      const [newId] = await db('agency').insert(data);
      return await db('agency').where('id', newId).first();
    }

    // Kiểm tra username trước để trả lỗi rõ ràng, trước khi mở transaction
    const existingUser = await db('system_users').where('username', accountData.username).first();
    if (existingUser) {
      throw new Error('Tên đăng nhập đã tồn tại');
    }

    return await db.transaction(async (trx) => {
      const [newAgencyId] = await trx('agency').insert(data);
      const agency = await trx('agency').where('id', newAgencyId).first();

      const passwordHash = await bcrypt.hash(accountData.password, 10);
      await trx('system_users').insert({
        username: accountData.username,
        password_hash: passwordHash,
        full_name: data.agency_name,
        email: normalizeAgencyEmail(data.email),
        role: 'agency',
        agency_id: newAgencyId,
        is_active: true,
        must_change_password: true,
      });

      return { ...agency, createdAccount: { username: accountData.username } };
    });
  }
  
    /**
     * Cập nhật thông tin đại lý
     */
    async updateAgency(id: number, data: any, scope?: RequestScope | null) {
      await db.transaction(async (trx) => {
        const query = trx('agency').where('id', id);

        if (scope?.agencyId) {
          query.andWhere('id', scope.agencyId);
        } else if (scope?.provinceIds?.length) {
          query.whereIn('province_id', scope.provinceIds);
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
    if (scope?.agencyId) {
      agencyQuery.andWhere('id', scope.agencyId);
    } else if (scope?.provinceIds?.length) {
      agencyQuery.whereIn('province_id', scope.provinceIds);
    }

    const agency = await agencyQuery.first();
    if (!agency) {
      throw new Error('Đại lý không tồn tại');
    }
    // 2. Thực hiện xóa
    const result = await db('agency').where('id', id).del();  
    return result;
  }
}