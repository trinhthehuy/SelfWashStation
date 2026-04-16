// audit.controller.ts
import { Response, NextFunction } from 'express';
import { type AuthRequest } from '../middleware/auth.js';
import { auditService } from '../services/audit.service.js';

export class AuditController {
  async getLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, user_id, action, entity_type, start_date, end_date } = req.query;

      const result = await auditService.getLogs({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
        userId: user_id ? Number(user_id) : undefined,
        action: action as string | undefined,
        entityType: entity_type as string | undefined,
        startDate: start_date as string | undefined,
        endDate: end_date as string | undefined,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
