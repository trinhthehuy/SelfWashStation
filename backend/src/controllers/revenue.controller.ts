import { Response, NextFunction } from 'express';
import { getRequestScope, type AuthRequest } from '../middleware/auth.js';
import { RevenueService } from '../services/revenue.service.js';

const revenueService = new RevenueService();

export class RevenueController {
    async getReport(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const scope = getRequestScope(req);
            const result = await revenueService.getRevenueReport({
                ...req.query,
                page: req.query.page ? Number(req.query.page) : 1,
                limit: req.query.limit ? Number(req.query.limit) : 20,
                // Apply scope as mandatory filters (override any user-supplied scope fields)
                ...(scope.agencyId != null && { agency_id: scope.agencyId }),
                ...(scope.provinceIds?.length && { scoped_province_ids: scope.provinceIds }),
                ...(scope.stationIds?.length && { scoped_station_ids: scope.stationIds }),
            });

            res.json(result);
        } catch (error) {
            console.error(">>> [Revenue Controller] ERROR:", error);
            next(error);
        }
    }

    async getHourly(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const scope = getRequestScope(req);
            const result = await revenueService.getHourlyReport(req.query, scope);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getStats(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const scope = getRequestScope(req);
            const result = await revenueService.getSystemStats(scope);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    async getStationPie(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const scope = getRequestScope(req);
            const result = await revenueService.getStationRevenuePie(6, scope);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}