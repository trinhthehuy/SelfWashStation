// bank-account.controller.ts
import { Response, NextFunction } from 'express';
import { getAgencyScope, type AuthRequest } from '../middleware/auth.js';
import { BankAccountService } from '../services/bank-account.service.js';

const bankAccountService = new BankAccountService();

export class BankAccountController {
    async getBankAccounts(req: AuthRequest, res: Response, next: NextFunction) {
      try {
        const queryAgencyId = req.query.agency_id ? Number(req.query.agency_id) : undefined;
        const agencyId = getAgencyScope(req, queryAgencyId) ?? undefined;
        const bankAccounts = await bankAccountService.getBankAccounts(agencyId);

        // 3. Trả về kết quả theo cấu trúc thống nhất
        res.json({
          success: true,
          data: bankAccounts
        });
      } catch (error) {
        next(error);
      }
    }
    //import BankAccount mới vào database
    async createBankAccount(req: AuthRequest, res: Response, next: NextFunction) {
      try {
        const newBankAccount = await bankAccountService.createBankAccount(req.body, getAgencyScope(req));
        res.status(201).json({
          message: "Tạo Tài khoản ngân hàng thành công",
          data: newBankAccount
        });
      } catch (error) {
        next(error);
      }
    }
  
    //update Tài khoản ngân hàng vào database
    async updateBankAccount(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
  
      // Gọi đến service để xử lý logic DB
      const updatedBankAccount = await bankAccountService.updateBankAccount(Number(id), data, getAgencyScope(req));
  
      if (!updatedBankAccount) {
        return res.status(404).json({ message: 'Không tìm thấy Tài khoản ngân hàng cần sửa' });
      }
  
      return res.status(200).json(updatedBankAccount);
    } catch (error: any) {
      console.error("Lỗi Controller Update:", error);
      return res.status(500).json({ message: 'Lỗi hệ thống khi cập nhật Tài khoản ngân hàng' });
    }
  }
  
    async deleteBankAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await bankAccountService.deleteBankAccount(Number(id), getAgencyScope(req));
      
      res.status(200).json({
        message: "Xóa Tài khoản ngân hàng thành công",
        data: { id: Number(id) }
      });
    } catch (error) {
      next(error);
    }
  }
    
}