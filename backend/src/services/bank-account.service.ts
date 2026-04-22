// agency.service.ts
import db from '../db/index.js';
export class BankAccountService {
  async getBankAccounts(agencyId?: number | string) {
      // 1. Khởi tạo query cơ bản với các Join cần thiết
      const query = db('bank_account as b')
        .select(
          'b.*',                // Lấy tất cả thông tin tài khoản ngân hàng
          'a.agency_name',      // Lấy tên đại lý từ bảng join
          'a.identity_number',   // Lấy CMND/CCCD từ bảng join
          db.raw(`(
            SELECT COALESCE(s.transfer_prefix, s.station_name)
            FROM stations s
            WHERE s.bank_account_id = b.id
            ORDER BY s.id ASC
            LIMIT 1
          ) as station_code`),
          db.raw(`(
            SELECT wb.bay_code
            FROM wash_bays wb
            INNER JOIN stations s ON s.id = wb.station_id
            WHERE s.bank_account_id = b.id
            ORDER BY wb.id ASC
            LIMIT 1
          ) as bay_code`)
        )
        .leftJoin('agency as a', 'b.agency_id', 'a.id');

      // 2. Kiểm tra điều kiện: Nếu có agencyId thì thêm WHERE, nếu không thì lấy hết
      if (agencyId) {
        query.where('b.agency_id', agencyId);
      }

      // 3. Thực thi truy vấn
      const bankAccounts = await query;
      return bankAccounts;
    }

    async createBankAccount(data: any, scopedAgencyId?: number | null) {
      const payload = {
        ...data,
        agency_id: scopedAgencyId || data.agency_id
      };

      const [newId] = await db('bank_account').insert(payload);
    // Trả về toàn bộ thông tin để Frontend có ID và ngày tạo để dùng ngay
      return await db('bank_account').where('id', newId).first();
    }
  
    async updateBankAccount(id: number, data: any, scopedAgencyId?: number | null) {
      const query = db('bank_account').where('id', id);
      if (scopedAgencyId) {
        query.andWhere('agency_id', scopedAgencyId);
      }

      // Thực hiện update dựa trên ID
      await query
        .update({
          ...data,
          updated_at: db.fn.now() // Cập nhật thời gian chỉnh sửa
        });
  
      return await db('bank_account').where('id', id).first();
    }
  
    // BankAccount.service.js
  async deleteBankAccount(id: number, scopedAgencyId?: number | null) {
    // 1. Kiểm tra Tài khoản ngân hàng có tồn tại không trước khi xóa
    const bankAccountQuery = db('bank_account').where('id', id);
    if (scopedAgencyId) {
      bankAccountQuery.andWhere('agency_id', scopedAgencyId);
    }

    const BankAccount = await bankAccountQuery.first();
    if (!BankAccount) {
      throw new Error('Tài khoản ngân hàng không tồn tại');
    }
    // 2. Thực hiện xóa
    const deleteQuery = db('bank_account').where('id', id);
    if (scopedAgencyId) {
      deleteQuery.andWhere('agency_id', scopedAgencyId);
    }

    await deleteQuery.del();  
    return BankAccount;
  }
}