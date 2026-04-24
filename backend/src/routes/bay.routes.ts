//bay.routes.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { BayController } from '../controllers/bay.controller.js';

const router = Router();
const bayController = new BayController();

//router.get('/', authenticateToken, stationController.getAllStations);
router.get('/', bayController.getBays   );
router.post('/', bayController.createBay);
router.put('/:id', bayController.updateBay);
router.delete('/:id', bayController.deleteBay );
export default router;
