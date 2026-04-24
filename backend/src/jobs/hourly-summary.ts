// src/jobs/hourly-summary.ts
import cron from 'node-cron';
import { aggregationService } from '../services/aggregation.service.js';

export const initJobs = async () => {

    // Kiểm tra xem dữ liệu trước đó đã có chưa, nếu chưa thì chạy bù 
    // await aggregationService.rebuildAllHistoryData();
    await aggregationService.checkAndSyncIfMissing();

    // Bắt đầu lịch trình chạy hàng giờ 
    cron.schedule('0 * * * *', async () => {
        console.log('--- Đang chạy job tổng hợp hàng giờ ---');
        await aggregationService.aggregateHourlyData();
    });
};