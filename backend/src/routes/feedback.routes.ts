// feedback.routes.ts
import { Router } from 'express';
import { authorizeRoles } from '../middleware/auth.js';
import { FeedbackController } from '../controllers/feedback.controller.js';

const router = Router();
const feedbackController = new FeedbackController();

// Lấy danh sách góp ý (scoped)
router.get('/', feedbackController.getFeedbacks.bind(feedbackController));
router.get('/:id', feedbackController.getFeedbackById.bind(feedbackController));

// Tất cả role gửi góp ý mới
router.post('/', authorizeRoles(['sa', 'engineer', 'agency', 'regional_manager', 'station_supervisor']), feedbackController.createFeedback.bind(feedbackController));

// SA phản hồi
router.put('/:id/reply', authorizeRoles(['sa']), feedbackController.replyFeedback.bind(feedbackController));

// Creator đánh dấu đã đọc reply
router.put('/:id/read', authorizeRoles(['sa', 'engineer', 'agency', 'regional_manager', 'station_supervisor']), feedbackController.markRead.bind(feedbackController));

export default router;
