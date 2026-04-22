// routes/wash-session.routes.ts
import { Router } from 'express';
import { TransController } from '../controllers/transaction.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();
const transController = new TransController();

router.get('/', transController.getTransactions);
router.delete('/:id', authenticateToken, authorizeRoles(['sa']), transController.deleteTransaction);

export default router;