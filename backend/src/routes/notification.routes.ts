import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';

const router = Router();
const notificationController = new NotificationController();

router.get('/', notificationController.getNotifications.bind(notificationController));
router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController));
router.put('/:id/read', notificationController.markRead.bind(notificationController));
router.put('/mark-all-read', notificationController.markAllRead.bind(notificationController));

export default router;
