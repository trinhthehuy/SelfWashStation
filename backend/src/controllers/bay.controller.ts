//bay.controller.ts
import { Response, NextFunction } from 'express';
import { getRequestScope, type AuthRequest } from '../middleware/auth.js';
import { BayService } from '../services/bay.service.js';
import { auditService } from '../services/audit.service.js';

const bayService = new BayService();

export class BayController {
  async getBays(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { station_id } = req.query;     
      const bays = await bayService.getBays(station_id as string, getRequestScope(req));      
      res.json(bays);
    } catch (error) {
      next(error);
    }
  }

  async createBay(req: AuthRequest, res: Response) {
        try {
            const { station_id } = req.body;
            if (!station_id) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Vui lòng cung cấp station_id" 
                });
            }
            const newBay = await bayService.createBay(Number(station_id), getRequestScope(req));
            
            auditService.log({
                userId: req.user?.id,
                username: req.user?.username || 'system',
                role: req.user?.role || 'unknown',
                action: 'BAY_CREATE',
                entityType: 'bay',
                entityId: newBay.id,
                entityName: newBay.bay_code,
                ip: req.ip,
            });

            return res.status(201).json({
                success: true,
                message: "Thêm trụ mới thành công",
                data: newBay
            });
        } catch (error: any) {
            console.error("BayController Error:", error.message);
            return res.status(500).json({
                success: false,
                message: error.message || "Lỗi hệ thống khi tạo trụ"
            });
        }
    }

  async updateBay(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updatedBay = await bayService.updateBay(Number(id), req.body, getRequestScope(req));
      
      if (!updatedBay) {
        return res.status(404).json({ message: 'Không tìm thấy Trụ rửa để cập nhật' });
      }

      auditService.log({
        userId: req.user?.id,
        username: req.user?.username || 'system',
        role: req.user?.role || 'unknown',
        action: 'BAY_UPDATE',
        entityType: 'bay',
        entityId: Number(id),
        entityName: updatedBay.bay_code,
        ip: req.ip,
      });

      res.json(updatedBay);
    } catch (error) {
      next(error); // Đồng nhất cách xử lý lỗi
    }
  }

  async deleteBay(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deletedBay = await bayService.deleteBay(Number(id), getRequestScope(req));
      
      auditService.log({
        userId: req.user?.id,
        username: req.user?.username || 'system',
        role: req.user?.role || 'unknown',
        action: 'BAY_DELETE',
        entityType: 'bay',
        entityId: Number(id),
        entityName: deletedBay.bay_code,
        ip: req.ip,
      });

      res.json({ message: "Xóa thành công", id: Number(id) });
    } catch (error) {
      next(error);
    }
  }
}