// aggregation.service.ts
import db from '../db/index.js';
import dayjs from 'dayjs';

export class AggregationService {
    /**
     * Tổng hợp dữ liệu giao dịch theo trụ (bay) và trạm (station) hàng giờ
     * Sử dụng cơ chế Upsert để cập nhật dữ liệu cho ngày hiện tại
     */
    async aggregateHourlyData() {
        const today = dayjs().format('YYYY-MM-DD');

        try {
            console.log(`>>> [Aggregation]: Bắt đầu tổng hợp dữ liệu cho ngày ${today}`);

            const summaryData = await db('transactions')
                .select(
                    db.raw('tran_date as summary_date'),
                    db.raw('HOUR(COALESCE(transaction_time, created_at)) as hour'),
                    'station_id',
                    'bay_code'
                )
                .sum('amount as total_amount')
                .count('id as total_transactions')
                .sum('op as total_op_time')
                .sum('foam as total_foam_time')
                .where('tran_date', today)
                .where('status', 'processed')
                .groupBy('tran_date', 'hour', 'station_id', 'bay_code');

            if (!summaryData || summaryData.length === 0) {
                console.log(`>>> [Aggregation]: Không có giao dịch nào để tổng hợp trong ngày ${today}`);
                return { success: true, count: 0 };
            }

            // Thực hiện Upsert vào bảng hourly_bay_summary
            await Promise.all(summaryData.map(row => {
                return db('hourly_bay_summary')
                    .insert({
                        summary_date: row.summary_date,
                        hour: row.hour,
                        station_id: row.station_id,
                        bay_code: row.bay_code || 'N/A',
                        total_amount: row.total_amount || 0,
                        total_transactions: Number(row.total_transactions || 0),
                        total_op_time: row.total_op_time || 0,
                        total_foam_time: row.total_foam_time || 0,
                        last_updated_at: db.fn.now()
                    })
                    .onConflict(['summary_date', 'hour', 'station_id', 'bay_code'])
                    .merge();
            }));

            console.log(`>>> [Aggregation]: Hoàn thành tổng hợp ${summaryData.length} bản ghi vào hourly_bay_summary.`);
            
            return {
                success: true,
                count: summaryData.length,
                date: today
            };

        } catch (error) {
            console.error(">>> [Aggregation Error]:", error);
            throw error;
        }
    }

    /**
     * Tổng hợp dữ liệu từ hourly_bay_summary sang daily_bay_summary
     */
    async aggregateDailyData() {
        const today = dayjs().format('YYYY-MM-DD');
        try {
            console.log(`>>> [Aggregation]: Bắt đầu tổng hợp dữ liệu Daily cho ngày ${today}`);

            const hourlyData = await db('hourly_bay_summary')
                .select('summary_date', 'station_id', 'bay_code')
                .sum('total_amount as total_amount')
                .sum('total_transactions as total_transactions')
                .sum('total_op_time as total_op_time')
                .sum('total_foam_time as total_foam_time')
                .where('summary_date', today)
                .groupBy('summary_date', 'station_id', 'bay_code');

            if (!hourlyData || hourlyData.length === 0) {
                console.log(`>>> [Aggregation]: Không có dữ liệu hourly để tổng hợp Daily.`);
                return { success: true, count: 0 };
            }

            await Promise.all(hourlyData.map(row => {
                return db('daily_bay_summary')
                    .insert({
                        summary_date: row.summary_date,
                        station_id: row.station_id,
                        bay_code: row.bay_code,
                        total_amount: row.total_amount || 0,
                        total_transactions: Number(row.total_transactions || 0),
                        total_op_time: row.total_op_time || 0,
                        total_foam_time: row.total_foam_time || 0,
                        last_updated_at: db.fn.now()
                    })
                    .onConflict(['summary_date', 'station_id', 'bay_code'])
                    .merge();
            }));

            console.log(`>>> [Aggregation]: Hoàn thành tổng hợp ${hourlyData.length} bản ghi vào daily_bay_summary.`);
            return { success: true, count: hourlyData.length };
        } catch (error) {
            console.error(">>> [Aggregation Daily Error]:", error);
            throw error;
        }
    }

    async syncHistoryData(startDate: string, endDate: string) {
        try {
            console.log(`>>> [Sync]: Bắt đầu quét dữ liệu từ ${startDate} đến ${endDate}`);

            const historyData = await db('transactions')
                .select(
                    db.raw('tran_date as summary_date'),
                    db.raw('HOUR(COALESCE(transaction_time, created_at)) as hour'),
                    'station_id',
                    'bay_code'
                )
                .sum('amount as total_amount')
                .count('id as total_transactions')
                .sum('op as total_op_time')
                .sum('foam as total_foam_time')
                .whereBetween('tran_date', [startDate, endDate])
                .where('status', 'processed')
                .groupBy('tran_date', 'hour', 'station_id', 'bay_code');

            if (!historyData || historyData.length === 0) {
                console.log(">>> [Sync]: Không tìm thấy dữ liệu cũ.");
                return;
            }

            // Tối ưu: Dùng Batch Insert với onConflict
            // Knex hỗ trợ truyền mảng vào insert
            await db('hourly_bay_summary')
                .insert(historyData.map(row => ({
                    summary_date: row.summary_date,
                    hour: row.hour,
                    station_id: row.station_id,
                    bay_code: row.bay_code || 'N/A',
                    total_amount: row.total_amount || 0,
                    total_transactions: Number(row.total_transactions || 0),
                    total_op_time: row.total_op_time || 0,
                    total_foam_time: row.total_foam_time || 0,
                    last_updated_at: db.fn.now()
                })))
                .onConflict(['summary_date', 'hour', 'station_id', 'bay_code'])
                .merge();

            console.log(`>>> [Sync]: Đã đồng bộ xong ${historyData.length} bản ghi vào Hourly.`);

            // Đồng bộ luôn sang Daily
            const dailyHistory = await db('hourly_bay_summary')
                .select('summary_date', 'station_id', 'bay_code')
                .sum('total_amount as total_amount')
                .sum('total_transactions as total_transactions')
                .sum('total_op_time as total_op_time')
                .sum('total_foam_time as total_foam_time')
                .whereBetween('summary_date', [startDate, endDate])
                .groupBy('summary_date', 'station_id', 'bay_code');

            if (dailyHistory.length > 0) {
                await db('daily_bay_summary')
                    .insert(dailyHistory.map(row => ({
                        summary_date: row.summary_date,
                        station_id: row.station_id,
                        bay_code: row.bay_code,
                        total_amount: row.total_amount || 0,
                        total_transactions: Number(row.total_transactions || 0),
                        total_op_time: row.total_op_time || 0,
                        total_foam_time: row.total_foam_time || 0,
                        last_updated_at: db.fn.now()
                    })))
                    .onConflict(['summary_date', 'station_id', 'bay_code'])
                    .merge();
                console.log(`>>> [Sync]: Đã đồng bộ xong ${dailyHistory.length} bản ghi vào Daily.`);
            }
        } catch (error) {
            console.error(">>> [Sync Error]:", error);
        }
    }

    async checkAndSyncIfMissing() {
        try {
            console.log(">>> [Auto-Sync]: Bắt đầu kiểm tra toàn diện dữ liệu...");

            const distinctDaysInTrans = await db('transactions')
                .distinct(db.raw('tran_date as date'))
                .where('status', 'processed')
                .orderBy('tran_date', 'asc');

            if (distinctDaysInTrans.length === 0) {
                console.log(">>> [Auto-Sync]: Không có giao dịch nào để xử lý.");
                return;
            }

            const existingDaysInSummary = await db('hourly_bay_summary')
                .distinct('summary_date')
                .then(rows => rows.map(r => dayjs(r.summary_date).format('YYYY-MM-DD')));

            const today = dayjs().format('YYYY-MM-DD');
            const missingDays = distinctDaysInTrans
                .map(r => dayjs(r.date).format('YYYY-MM-DD'))
                .filter(date => !existingDaysInSummary.includes(date) || date === today);

            if (missingDays.length > 0) {
                console.log(`>>> [Auto-Sync]: Phát hiện ${missingDays.length} ngày cần đồng bộ:`, missingDays);
                for (const date of missingDays) {
                    await this.syncHistoryData(date, date); 
                }
                console.log(">>> [Auto-Sync]: Hoàn thành đồng bộ tất cả các ngày thiếu.");
            } else {
                console.log(">>> [Auto-Sync]: Dữ liệu đã đầy đủ.");
            }

            // Đảm bảo daily_bay_summary luôn được cập nhật từ hourly_bay_summary cho hôm nay
            await this.aggregateDailyData();
        } catch (error) {
            console.error(">>> [Auto-Sync Error]:", error);
        }
    }

    async rebuildAllHistoryData() {
        try {
            console.log(`>>> [Rebuild]: BẮT ĐẦU LÀM SẠCH VÀ TÍNH TOÁN LẠI TOÀN BỘ...`);

            await db('hourly_bay_summary').truncate();

            const fullSql = `
                INSERT INTO hourly_bay_summary 
                (summary_date, hour, station_id, bay_code, total_amount, total_transactions, total_op_time, total_foam_time, last_updated_at)
                SELECT 
                    tran_date as summary_date, 
                    HOUR(COALESCE(transaction_time, created_at)) as hour,
                    station_id, 
                    bay_code, 
                    SUM(amount) as total_amount, 
                    COUNT(id) as total_transactions, 
                    SUM(op) as total_op_time, 
                    SUM(foam) as total_foam_time, 
                    NOW() as last_updated_at 
                FROM transactions 
                WHERE status = 'processed' 
                GROUP BY tran_date, hour, station_id, bay_code
            `;

            await db.raw(fullSql);
            console.log(`>>> [Rebuild]: Hoàn tất tính toán lại toàn bộ dữ liệu Hourly.`);

            // Rebuild Daily từ Hourly
            await db('daily_bay_summary').truncate();
            const dailySql = `
                INSERT INTO daily_bay_summary 
                (summary_date, station_id, bay_code, total_amount, total_transactions, total_op_time, total_foam_time, last_updated_at)
                SELECT 
                    summary_date, 
                    station_id, 
                    bay_code, 
                    SUM(total_amount) as total_amount, 
                    SUM(total_transactions) as total_transactions, 
                    SUM(total_op_time) as total_op_time, 
                    SUM(total_foam_time) as total_foam_time, 
                    NOW() as last_updated_at 
                FROM hourly_bay_summary 
                GROUP BY summary_date, station_id, bay_code
            `;
            await db.raw(dailySql);
            console.log(`>>> [Rebuild]: Hoàn tất tính toán lại toàn bộ dữ liệu Daily!`);

        } catch (error) {
            console.error(">>> [Rebuild Error]:", error);
        }
    }

    /**
     * Cập nhật cộng dồn (incremental) cho bảng summary ngay khi có giao dịch mới
     */
    async incrementSummary(tx: any) {
        try {
            const txTime = tx.transaction_time || tx.created_at;
            const date = dayjs(txTime).format('YYYY-MM-DD');
            const hour = dayjs(txTime).hour();

            if (!tx.station_id) return;

            await db('hourly_bay_summary')
                .insert({
                    summary_date: date,
                    hour: hour,
                    station_id: tx.station_id,
                    bay_code: tx.bay_code || 'N/A',
                    total_transactions: 1,
                    total_amount: tx.amount || 0,
                    total_op_time: tx.op || 0,
                    total_foam_time: tx.foam || 0,
                    last_updated_at: db.fn.now()
                })
                .onConflict(['summary_date', 'hour', 'station_id', 'bay_code'])
                .merge({
                    total_transactions: db.raw('hourly_bay_summary.total_transactions + 1'),
                    total_amount: db.raw('hourly_bay_summary.total_amount + ?', [tx.amount || 0]),
                    total_op_time: db.raw('hourly_bay_summary.total_op_time + ?', [tx.op || 0]),
                    total_foam_time: db.raw('hourly_bay_summary.total_foam_time + ?', [tx.foam || 0]),
                    last_updated_at: db.fn.now()
                });

            // Đồng thời cập nhật Daily Summary
            await db('daily_bay_summary')
                .insert({
                    summary_date: date,
                    station_id: tx.station_id,
                    bay_code: tx.bay_code || 'N/A',
                    total_transactions: 1,
                    total_amount: tx.amount || 0,
                    total_op_time: tx.op || 0,
                    total_foam_time: tx.foam || 0,
                    last_updated_at: db.fn.now()
                })
                .onConflict(['summary_date', 'station_id', 'bay_code'])
                .merge({
                    total_transactions: db.raw('daily_bay_summary.total_transactions + 1'),
                    total_amount: db.raw('daily_bay_summary.total_amount + ?', [tx.amount || 0]),
                    total_op_time: db.raw('daily_bay_summary.total_op_time + ?', [tx.op || 0]),
                    total_foam_time: db.raw('daily_bay_summary.total_foam_time + ?', [tx.foam || 0]),
                    last_updated_at: db.fn.now()
                });

            console.log(`>>> [Aggregation]: Real-time update success (Hourly & Daily) for TX ${tx.transaction_id || 'manual'}`);
        } catch (error) {
            console.error(">>> [Aggregation Incremental Error]:", error);
        }
    }
}

export const aggregationService = new AggregationService();
