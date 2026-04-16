// routes/wash-session.routes.ts
import { Router } from 'express';
import { TransController } from '../controllers/transaction.controller.js';
// import { authenticateToken } from '../middleware/auth'; // Mở ra nếu cần bảo mật

const router = Router();
const transController = new TransController();

router.get('/', transController.getTransactions);

export default router;