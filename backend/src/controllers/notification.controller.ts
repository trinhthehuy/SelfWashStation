import { Response, NextFunction } from 'express';
import { type AuthRequest } from '../middleware/auth.js';
import { NotificationService, type NotificationType } from '../services/notification.service.js';

const notificationService = new NotificationService();

export class NotificationController {
  async getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const statusRaw = String(req.query.status ?? 'all');
      const status = ['all', 'read', 'unread'].includes(statusRaw) ? statusRaw as 'all' | 'read' | 'unread' : 'all';
      const typeRaw = req.query.type ? String(req.query.type) : undefined;
      const type = typeRaw as NotificationType | undefined;
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);

      const result = await notificationService.listForUser(userId, { status, type, page, limit });
      res.json({
        success: true,
        data: result.data,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit) || 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const count = await notificationService.getUnreadCount(req.user!.id);
      res.json({ success: true, count });
    } catch (error) {
      next(error);
    }
  }

  async markRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ message: 'ID thông báo không hợp lệ' });
      }

      const updated = await notificationService.markRead(id, req.user!.id);
      if (!updated) {
        return res.status(404).json({ message: 'Không tìm thấy thông báo' });
      }

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async markAllRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const typeRaw = req.body?.type ? String(req.body.type) : undefined;
      const type = typeRaw as NotificationType | undefined;
      const affected = await notificationService.markAllRead(req.user!.id, type);
      res.json({ success: true, markedCount: Number(affected ?? 0) });
    } catch (error) {
      next(error);
    }
  }
}
