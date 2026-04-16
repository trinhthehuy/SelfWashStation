//station.routes.ts
import { Router } from 'express';
import { authorizeRoles } from '../middleware/auth.js';
import { StationController } from '../controllers/station.controller.js';

const router = Router();
const stationController = new StationController();

// Get all stations
//router.get('/', authenticateToken, stationController.getAllStations);
router.get('/', stationController.getAllStations);

router.get('/filter', stationController.getStationsByFilters);
router.get('/generate-code', stationController.getNextStationCode);
router.post('/', authorizeRoles(['sa', 'engineer']), stationController.createStation);
router.put('/assign-strategy', authorizeRoles(['sa', 'engineer', 'agency']), stationController.assignStrategy);
router.put('/:id', authorizeRoles(['sa', 'engineer']), stationController.update);
router.delete('/:id', authorizeRoles(['sa', 'engineer']), stationController.deleteStation);
export default router;