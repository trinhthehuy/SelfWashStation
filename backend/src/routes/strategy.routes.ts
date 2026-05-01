//strategy.routes.ts
import { Router } from 'express';
import { StrategyController } from '../controllers/strategy.controller.js';

const router = Router();
const strategyController = new StrategyController();

router.route('/')
    .get(strategyController.getStrategies)
    .post(strategyController.createStrategy);

router.put('/:id', strategyController.updateStrategy);
router.delete('/:id', strategyController.deleteStrategy);  

export default router;
