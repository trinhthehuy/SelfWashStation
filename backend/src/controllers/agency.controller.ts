// ward.controller.ts
import { Response, NextFunction } from 'express';
import { getRequestScope, type AuthRequest } from '../middleware/auth.js';
import { AgencyService } from '../services/agency.service.js';
import { auditService } from '../services/audit.service.js';

const agencyService = new AgencyService();

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
        if (error.message === 'Tên đăng nhập đã tồn tại') {
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
        ip: req.ip,
      });
  
      return res.status(200).json(updatedAgency);
    } catch (error: any) {
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
      await agencyService.deleteAgency(Number(id), getRequestScope(req));
      auditService.log({
        userId: req.user?.id,
        username: req.user?.username || 'system',
        role: req.user?.role || 'unknown',
        action: 'AGENCY_DELETE',
        entityType: 'agency',
        entityId: Number(id),
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