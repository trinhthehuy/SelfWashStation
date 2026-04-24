import { RevenueService } from '../src/services/revenue.service.js';
import db from '../src/db/index.js';
import dayjs from 'dayjs';

async function test() {
    const service = new RevenueService();
    console.log('🧪 Testing getSystemStats...');
    try {
        const result = await service.getSystemStats(null);
        console.log('✅ getSystemStats result:', JSON.stringify(result.data, null, 2));
        
        // Kiểm tra trực tiếp query doanh thu tháng này
        const revenueThisRow = await db('hourly_bay_summary as dbs')
            .select(db.raw('SUM(total_amount) as revenue'), db.raw('SUM(total_transactions) as sessions'))
            .whereBetween('summary_date', [
                db.raw('DATE_SUB(CURDATE(), INTERVAL 7 DAY)'),
                db.raw('DATE_SUB(CURDATE(), INTERVAL 1 DAY)')
            ])
            .first();
        console.log('📊 Raw Revenue (7 days):', revenueThisRow);

        const revenueMonthRow = await db('hourly_bay_summary as dbs')
            .select(db.raw('SUM(total_amount) as revenue'), db.raw('SUM(total_transactions) as sessions'))
            .whereRaw('MONTH(summary_date) = MONTH(CURDATE()) AND YEAR(summary_date) = YEAR(CURDATE())')
            .first();
        console.log('📊 Raw Revenue (This Month):', revenueMonthRow);

    } catch (error) {
        console.error('❌ test failed:', error);
    }

    await db.destroy();
    process.exit(0);
}

test();
