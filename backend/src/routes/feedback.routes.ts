// feedback.routes.ts
import { Router } from 'express';
import { authorizeRoles } from '../middleware/auth.js';
import { FeedbackController } from '../controllers/feedback.controller.js';

const router = Router();
const feedbackController = new FeedbackController();

// Đếm badge (tất cả roles, mỗi role trả về số khác nhau)
router.get('/unread-count', feedbackController.getUnreadCount.bind(feedbackController));

// Lấy danh sách góp ý (scoped)
router.get('/', feedbackController.getFeedbacks.bind(feedbackController));

// Đại lý gửi góp ý mới
router.post('/', authorizeRoles(['agency']), feedbackController.createFeedback.bind(feedbackController));

// SA/Engineer phản hồi
router.put('/:id/reply', authorizeRoles(['sa', 'engineer']), feedbackController.replyFeedback.bind(feedbackController));

// Agency đánh dấu đã đọc reply
router.put('/:id/read', authorizeRoles(['agency']), feedbackController.markRead.bind(feedbackController));

export default router;
