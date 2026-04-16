// bank.account.controller.ts
import { Response, NextFunction } from 'express';
import { getAgencyScope, type AuthRequest } from '../middleware/auth.js';
import { StrategyService } from '../services/strategy.service.js';
import { auditService } from '../services/audit.service.js';

const strategyService = new StrategyService();

export class StrategyController {
  /**
   * Lấy danh sách chiến lược theo đại lý (nếu có truyền agencyId)
    - Nếu có agencyId: trả về chiến lược của đại lý đó
   */
  async getStrategies(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Lấy agency_id từ query params
      const queryAgencyId = req.query.agency_id ? Number(req.query.agency_id) : undefined;
      const agency_id = getAgencyScope(req, queryAgencyId) ?? undefined;
      // Gọi service xử lý logic
      const strategies = await strategyService.getStrategies(agency_id);
      res.json({
        success: true,
        data: strategies    
      });
    } catch (error) {
      // Chuyển lỗi sang middleware xử lý lỗi tập trung
      next(error);
    }
  }

  async createStrategy(req: AuthRequest, res: Response, next: NextFunction) {
        try {
          const newStrategy = await strategyService.createStrategy(req.body, getAgencyScope(req));
          auditService.log({
            userId: req.user?.id,
            username: req.user?.username || 'system',
            role: req.user?.role || 'unknown',
            action: 'STRATEGY_CREATE',
            entityType: 'strategy',
            entityId: newStrategy.id,
            entityName: newStrategy.strategy_name,
            ip: req.ip,
          });
          res.status(201).json({
            message: "Tạo Chiến lược thành công",
            data: newStrategy
          });
        } catch (error) {
          next(error);
        }
      }
    
      //update Chiến lược vào database
      async updateStrategy(req: AuthRequest, res: Response) {
      try {
        const { id } = req.params;
        const data = req.body;
    
        const updatedStrategy = await strategyService.updateStrategy(Number(id), data, getAgencyScope(req));
    
        if (!updatedStrategy) {
          return res.status(404).json({ message: 'Không tìm thấy Chiến lược cần sửa' });
        }

        auditService.log({
          userId: req.user?.id,
          username: req.user?.username || 'system',
          role: req.user?.role || 'unknown',
          action: 'STRATEGY_UPDATE',
          entityType: 'strategy',
          entityId: Number(id),
          entityName: updatedStrategy.strategy_name,
          ip: req.ip,
        });
    
        return res.status(200).json(updatedStrategy);
      } catch (error: any) {
        console.error("Lỗi Controller Update:", error);
        return res.status(500).json({ message: 'Lỗi hệ thống khi cập nhật Chiến lược' });
      }
    }
    
      async deleteStrategy(req: AuthRequest, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;
        await strategyService.deleteStrategy(Number(id), getAgencyScope(req));
        auditService.log({
          userId: req.user?.id,
          username: req.user?.username || 'system',
          role: req.user?.role || 'unknown',
          action: 'STRATEGY_DELETE',
          entityType: 'strategy',
          entityId: Number(id),
          ip: req.ip,
        });
        res.status(200).json({
          message: "Xóa Chiến lược thành công",
          data: { id: Number(id) }
        });
      } catch (error) {
        next(error);
      }
    }
}