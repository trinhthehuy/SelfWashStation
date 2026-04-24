//ward.routes.ts
import { Router } from 'express';
import { authorizeRoles } from '../middleware/auth.js';
import { AgencyController } from '../controllers/agency.controller.js';

const router = Router();
const agencyController = new AgencyController();

//router.get('/', authenticateToken, stationController.getAllStations);
router.get('/', agencyController.getAgencies);
router.post('/', authorizeRoles(['sa']), agencyController.createAgency);
router.put('/:id', authorizeRoles(['sa', 'agency']), agencyController.updateAgency);
router.delete('/:id', authorizeRoles(['sa']), agencyController.deleteAgency);
export default router;
