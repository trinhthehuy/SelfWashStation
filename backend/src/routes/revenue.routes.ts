import { Router } from 'express';
import { RevenueController } from '../controllers/revenue.controller.js';

const router = Router();
const revenueController = new RevenueController();

// GET /api/revenue
router.get('/', revenueController.getReport);

// GET /api/revenue/hourly  — heatmap doanh thu theo giờ
router.get('/hourly', revenueController.getHourly);

// GET /api/revenue/stats   — tổng quan hệ thống (KPI cards)
router.get('/stats', revenueController.getStats);

// GET /api/revenue/station-pie  — top 6 trạm doanh thu 30 ngày
router.get('/station-pie', revenueController.getStationPie);

export default router;
