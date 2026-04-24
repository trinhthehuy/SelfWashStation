import { Response, NextFunction } from 'express';
import { getRequestScope, type AuthRequest } from '../middleware/auth.js';
import { TransService } from '../services/transaction.service.js';
import { auditService } from '../services/audit.service.js';

const transService = new TransService();

export class TransController {
    async getTransactions(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { 
                page, 
                limit, 
                station_id, 
                bay_id,
                bay_code,
                start_date, 
                end_date, 
                status,
                include_total
            } = req.query;

            // STEP 2: Chuẩn bị object gửi vào Service
            const serviceParams = {
                page: page ? Number(page) : 1, 
                limit: limit ? Number(limit) : 20,
                station_id: station_id ? String(station_id) : undefined,
                bay_id: bay_id ? String(bay_id) : undefined,
                bay_code: bay_code ? String(bay_code) : undefined,
                start_date: start_date ? String(start_date) : undefined,
                end_date: end_date ? String(end_date) : undefined,
                status: status ? String(status) : undefined,
                include_total: include_total !== undefined ? include_total : true,
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

    async deleteTransaction(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const scope = getRequestScope(req);
            
            await transService.deleteTransaction(Number(id), scope);
            
            auditService.log({
                userId: req.user?.id,
                email: req.user?.email || 'system',
                role: req.user?.role || 'unknown',
                action: 'TRANSACTION_DELETE',
                entityType: 'transaction',
                entityId: Number(id),
                entityName: `Phiên rửa #${id}`,
                ip: req.ip,
            });

            res.json({
                success: true,
                message: 'Đã xóa phiên rửa thành công'
            });
        } catch (error) {
            console.error(">>> [Controller] ERROR Delete Transaction:", error);
            next(error);
        }
    }
}
