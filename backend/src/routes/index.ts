import { Router } from 'express';
import authRoutes from './auth.routes.js';
import bankTransferRoutes from './bank-transfer.routes.js';
import stationRoutes from './station.routes.js';
import wardRoutes from './ward.routes.js';
import agencyRoutes from './agency.routes.js';
import bankaccountRoutes from './bank-account.routes.js';
import strategyRoutes from './strategy.routes.js';
import bayRoutes from './bay.routes.js';
import transactionRoutes from './transaction.routes.js';
import revenueRoutes from './revenue.routes.js';
import feedbackRoutes from './feedback.routes.js';
import auditRoutes from './audit.routes.js';
import notificationRoutes from './notification.routes.js';
import { authenticateToken, attachScope } from '../middleware/auth.js';
const router = Router();

router.use('/auth', authRoutes);
router.use('/', bankTransferRoutes);

router.use(authenticateToken);
router.use(attachScope);

router.use('/stations', stationRoutes);
router.use('/wards', wardRoutes);
router.use('/agencies', agencyRoutes);
router.use('/bank-accounts', bankaccountRoutes);
router.use('/strategies', strategyRoutes);
router.use('/bays', bayRoutes);
router.use('/transactions', transactionRoutes);
router.use('/revenue', revenueRoutes);
router.use('/feedbacks', feedbackRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audit-logs', auditRoutes);

export default router;