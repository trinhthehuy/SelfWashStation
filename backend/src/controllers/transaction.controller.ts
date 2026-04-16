// Transaction.controller.ts
import { Response, NextFunction } from 'express';
import { getRequestScope, type AuthRequest } from '../middleware/auth.js';
import { TransService } from '../services/transaction.service.js';

const transService = new TransService();

export class TransController {
    async getTransactions(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { 
                page, 
                limit, 
                station_id, 
                start_date, 
                end_date, 
                status 
            } = req.query;

            // STEP 2: Chuẩn bị object gửi vào Service
            const serviceParams = {
                page: page ? Number(page) : 1, 
                limit: limit ? Number(limit) : 20,
                station_id: station_id ? String(station_id) : undefined,
                start_date: start_date ? String(start_date) : undefined,
                end_date: end_date ? String(end_date) : undefined,
                status: status ? String(status) : undefined,
                scope: getRequestScope(req)
            };

            const result = await transService.getTransactions(serviceParams);

            res.json({
                success: true,
                ...result
            });

        } catch (error) {
            console.error(">>> [Controller] ERROR Catch:", error);
            next(error);
        }
    }
}