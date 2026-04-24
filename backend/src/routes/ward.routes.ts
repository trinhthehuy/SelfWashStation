//ward.routes.ts
import { Router } from 'express';
import { WardController } from '../controllers/ward.controller.js';

const router = Router();
const wardController = new WardController();

router.get('/provinces', wardController.getProvinces);

router.get('/', wardController.getWards);
export default router;
