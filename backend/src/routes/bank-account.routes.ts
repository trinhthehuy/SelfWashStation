// bank-account.routes.ts
import { Router } from 'express';
import { authorizeRoles } from '../middleware/auth.js';
import { BankAccountController } from '../controllers/bank-account.controller.js';

const router = Router();
const bankAccountController = new BankAccountController();

// station_supervisor cannot access bank account data
const allowedRoles = authorizeRoles(['sa', 'engineer', 'regional_manager', 'agency']);

router.get('/', allowedRoles, bankAccountController.getBankAccounts);
router.post('/', allowedRoles, bankAccountController.createBankAccount);
router.put('/:id', allowedRoles, bankAccountController.updateBankAccount);
router.delete('/:id', allowedRoles, bankAccountController.deleteBankAccount);
export default router;
