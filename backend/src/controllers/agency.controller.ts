// ward.controller.ts
import { Response, NextFunction } from 'express';
import { getRequestScope, type AuthRequest } from '../middleware/auth.js';
import { AgencyService } from '../services/agency.service.js';
import { auditService } from '../services/audit.service.js';

const agencyService = new AgencyService();

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function normalizeRequiredText(value: unknown): string {
  return String(value || '').trim();
}

function validateRequiredAgencyFields(data: Record<string, any>): string | null {
  const requiredTextFields: Array<{ key: string; label: string }> = [
    { key: 'agency_name', label: 'Tên đại lý' },
    { key: 'address', label: 'Địa chỉ đại lý' },
    { key: 'phone', label: 'Số điện thoại đại lý' },
    { key: 'email', label: 'Email đại lý' },
  ];

  for (const field of requiredTextFields) {
    if (!normalizeRequiredText(data?.[field.key])) {
      return `${field.label} là bắt buộc`;
    }
  }

  if (!data?.province_id) {
    return 'Tỉnh/Thành phố là bắt buộc';
  }

  if (!data?.ward_id) {
    return 'Quận/Huyện là bắt buộc';
  }

  if (!isValidEmail(String(data?.email || ''))) {
    return 'Email đại lý không hợp lệ';
  }

  return null;
}

export class AgencyController {
  async getAgencies(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // 1. Lấy các tham số lọc từ query string
      const { ward_id, province_id } = req.query;

      // 2. Gọi service duy nhất với đối tượng filter
      // Chúng ta ép kiểu (as) để phù hợp với định nghĩa tham số của Service
      const agencies = await agencyService.getAgencies({
        ward_id: ward_id as string,
        province_id: province_id as string
      }, getRequestScope(req));

      res.json({
        success: true,
        data: agencies
      });
    } catch (error) {
      console.error(`[AGENCY CONTROLLER] ❌ Lỗi:`, error);
      // Chuyển lỗi sang middleware xử lý lỗi tập trung
      next(error);
    }
  }

  //import agency mới vào database
    async createAgency(req: AuthRequest, res: Response, next: NextFunction) {
      try {
        if (req.user?.role === 'agency' || req.user?.role === 'station_supervisor') {
          res.status(403).json({ message: 'Tài khoản này không được tạo đại lý mới' });
          return;
        }
        const { accountData, ...agencyData } = req.body;
        const validationError = validateRequiredAgencyFields(agencyData);
        if (validationError) {
          res.status(400).json({ message: validationError });
          return;
        }
        const newAgency = await agencyService.createAgency(agencyData, accountData);
        auditService.log({
          userId: req.user?.id,
          username: req.user?.username || 'system',
          role: req.user?.role || 'unknown',
          action: 'AGENCY_CREATE',
          entityType: 'agency',
          entityId: newAgency.agency?.id ?? newAgency.id,
          entityName: agencyData.agency_name,
          ip: req.ip,
        });
        res.status(201).json({
          message: "Tạo đại lý thành công",
          data: newAgency
        });
      } catch (error: any) {
        if (
          error.message === 'Tên đăng nhập đã tồn tại' ||
          error.message === 'Số CCCD / ID này đã được sử dụng bởi một đại lý khác'
        ) {
          res.status(409).json({ message: error.message });
          return;
        }
        next(error);
      }
    }
  
    //update đại lý vào database
    async updateAgency(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;

      const validationError = validateRequiredAgencyFields(data || {});
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
  
      const updatedAgency = await agencyService.updateAgency(Number(id), data, getRequestScope(req));
  
      if (!updatedAgency) {
        return res.status(404).json({ message: 'Không tìm thấy đại lý cần sửa' });
      }

      auditService.log({
        userId: req.user?.id,
        username: req.user?.username || 'system',
        role: req.user?.role || 'unknown',
        action: 'AGENCY_UPDATE',
        entityType: 'agency',
        entityId: Number(id),
        entityName: updatedAgency.agency_name,
        details: {
          changedFields: Object.keys(data || {})
        },
        ip: req.ip,
      });
  
      return res.status(200).json(updatedAgency);
    } catch (error: any) {
      if (
        error.message === 'Email đại lý là bắt buộc' || 
        error.message === 'Email đại lý không hợp lệ' ||
        error.message === 'Số CCCD / ID này đã được sử dụng bởi một đại lý khác'
      ) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Lỗi Controller Update:", error);
      return res.status(500).json({ message: 'Lỗi hệ thống khi cập nhật đại lý' });
    }
  }
  
    async deleteAgency(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (req.user?.role === 'agency' || req.user?.role === 'station_supervisor') {
        res.status(403).json({ message: 'Tài khoản này không được xóa đại lý' });
        return;
      }
      const deletedAgency = await agencyService.deleteAgency(Number(id), getRequestScope(req));
      auditService.log({
        userId: req.user?.id,
        username: req.user?.username || 'system',
        role: req.user?.role || 'unknown',
        action: 'AGENCY_DELETE',
        entityType: 'agency',
        entityId: Number(id),
        entityName: deletedAgency.agency_name,
        ip: req.ip,
      });
      res.status(200).json({
        message: "Xóa đại lý thành công",
        data: { id: Number(id) }
      });
    } catch (error) {
      next(error);
    }
  }
    
}