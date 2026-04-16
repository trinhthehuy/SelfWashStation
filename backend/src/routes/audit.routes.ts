// audit.routes.ts
import { Router } from 'express';
import { authorizeRoles } from '../middleware/auth.js';
import { AuditController } from '../controllers/audit.controller.js';

const router = Router();
const auditController = new AuditController();

// Chỉ sa và engineer được xem nhật ký
router.get('/', authorizeRoles(['sa', 'engineer']), (req, res, next) =>
  auditController.getLogs(req as any, res, next)
);

export default router;
