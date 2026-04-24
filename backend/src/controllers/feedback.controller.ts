// feedback.controller.ts
import { Response, NextFunction } from 'express';
import { AppError } from '../middleware/error-handler.js';
import { type AuthRequest } from '../middleware/auth.js';
import { FeedbackService } from '../services/feedback.service.js';
import { NotificationService } from '../services/notification.service.js';
import { auditService } from '../services/audit.service.js';
import db from '../db/index.js';

const feedbackService = new FeedbackService();
const notificationService = new NotificationService();

export class FeedbackController {
  /**
   * GET /feedbacks — lấy danh sách góp ý (scoped theo role)
   */
  async getFeedbacks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const feedbacks = await feedbackService.getFeedbacks(req.user!.role, req.user!.id);
      res.json({ success: true, data: feedbacks });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /feedbacks/:id — lấy chi tiết góp ý
   */
  async getFeedbackById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ message: 'ID góp ý không hợp lệ' });
      }

      const feedback = await feedbackService.getFeedbackById(id);
      if (!feedback) {
        return res.status(404).json({ message: 'Không tìm thấy góp ý' });
      }

      if (req.user!.role !== 'sa' && feedback.creator_user_id !== req.user!.id) {
        return res.status(403).json({ message: 'Bạn không có quyền xem góp ý này' });
      }

      res.json({ success: true, data: feedback });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /feedbacks — tất cả role tạo góp ý
   */
  async createFeedback(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { title, content } = req.body;
      if (!title?.trim() || !content?.trim()) {
        return res.status(400).json({ message: 'Tiêu đề và nội dung không được để trống' });
      }
      if (String(title).trim().length > 255) {
        return res.status(400).json({ message: 'Tiêu đề tối đa 255 ký tự' });
      }

      const feedback = await feedbackService.createFeedback(
        { title: String(title).trim(), content: String(content).trim() },
        {
          userId: req.user!.id,
          role: req.user!.role,
          agencyId: req.user!.agencyId,
        }
      );

      const saUsers = await db('system_users')
        .where('role', 'sa')
        .andWhere('is_active', 1)
        .select('id');

      await notificationService.createForUsers({
        recipientUserIds: saUsers.map((u) => Number(u.id)),
        type: 'FEEDBACK_NEW',
        title: 'Có góp ý mới cần xử lý',
        message: `${req.user!.fullName || req.user!.username} vừa gửi góp ý: ${String(title).trim()}`,
        actionUrl: `/gop-y?feedbackId=${feedback.id}`,
        relatedFeedbackId: feedback.id,
      });

      auditService.log({
        userId: req.user!.id,
        email: req.user!.email,
        role: req.user!.role,
        action: 'FEEDBACK_CREATE',
        entityType: 'feedback',
        entityId: feedback.id,
        entityName: String(title).trim(),
      });

      res.status(201).json({ message: 'Gửi góp ý thành công', data: feedback });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /feedbacks/:id/reply — SA phản hồi
   */
  async replyFeedback(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const numericId = Number(id);
      if (!Number.isFinite(numericId) || numericId <= 0) {
        return res.status(400).json({ message: 'ID góp ý không hợp lệ' });
      }

      const { reply } = req.body;
      if (!reply?.trim()) {
        return res.status(400).json({ message: 'Nội dung phản hồi không được để trống' });
      }

      const repliedBy = req.user!.email;
      const updated = await feedbackService.replyFeedback(numericId, String(reply).trim(), repliedBy);

      if (!updated.creator_user_id) {
        throw new AppError('Góp ý chưa có người tạo hợp lệ', 400);
      }

      await notificationService.createForUsers({
        recipientUserIds: [Number(updated.creator_user_id)],
        type: 'FEEDBACK_REPLIED',
        title: 'Góp ý của bạn đã được phản hồi',
        message: `Phản hồi cho góp ý: ${updated.title}`,
        actionUrl: `/gop-y?feedbackId=${updated.id}`,
        relatedFeedbackId: updated.id,
      });

      auditService.log({
        userId: req.user!.id,
        email: req.user!.email,
        role: req.user!.role,
        action: 'FEEDBACK_REPLY',
        entityType: 'feedback',
        entityId: updated.id,
        entityName: updated.title,
      });

      res.json({ message: 'Phản hồi thành công', data: updated });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /feedbacks/:id/read — creator đánh dấu đã đọc reply
   */
  async markRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ message: 'ID góp ý không hợp lệ' });
      }

      await feedbackService.markReadByCreator(id, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
