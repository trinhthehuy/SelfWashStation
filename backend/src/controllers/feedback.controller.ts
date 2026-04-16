// feedback.controller.ts
import { Response, NextFunction } from 'express';
import { getAgencyScope, type AuthRequest } from '../middleware/auth.js';
import { FeedbackService } from '../services/feedback.service.js';

const feedbackService = new FeedbackService();

export class FeedbackController {
  /**
   * GET /feedbacks — lấy danh sách góp ý (scoped theo role)
   */
  async getFeedbacks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const feedbacks = await feedbackService.getFeedbacks(getAgencyScope(req));
      res.json({ success: true, data: feedbacks });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /feedbacks/unread-count — đếm số badge cho notification bell
   */
  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const role = req.user!.role;
      const scopedAgencyId = getAgencyScope(req);
      const count = await feedbackService.getUnreadCount(role, scopedAgencyId);
      res.json({ success: true, count });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /feedbacks — agency gửi góp ý mới
   */
  async createFeedback(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { title, content } = req.body;
      if (!title?.trim() || !content?.trim()) {
        return res.status(400).json({ message: 'Tiêu đề và nội dung không được để trống' });
      }

      const agencyId = req.user!.agencyId;
      if (!agencyId) {
        return res.status(403).json({ message: 'Tài khoản không có đại lý liên kết' });
      }

      const feedback = await feedbackService.createFeedback({ title, content }, agencyId);
      res.status(201).json({ message: 'Gửi góp ý thành công', data: feedback });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /feedbacks/:id/reply — sa/engineer phản hồi
   */
  async replyFeedback(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reply } = req.body;
      if (!reply?.trim()) {
        return res.status(400).json({ message: 'Nội dung phản hồi không được để trống' });
      }

      const repliedBy = req.user!.username;
      const updated = await feedbackService.replyFeedback(Number(id), reply, repliedBy);
      res.json({ message: 'Phản hồi thành công', data: updated });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /feedbacks/:id/read — agency đánh dấu đã đọc reply
   */
  async markRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const scopedAgencyId = getAgencyScope(req);
      if (!scopedAgencyId) {
        return res.status(403).json({ message: 'Không có quyền thực hiện thao tác này' });
      }
      await feedbackService.markReadByAgency(Number(id), scopedAgencyId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
