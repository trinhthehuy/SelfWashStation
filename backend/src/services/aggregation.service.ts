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

            // 1. Truy vấn dữ liệu tổng hợp từ bảng transactions
            // Chỉ lấy các giao dịch có trạng thái 'processed'
            // Tối ưu: dùng tran_date (generated column, có index) thay DATE(created_at)
            // để MySQL dùng được Index Seek thay vì Full Table Scan

            const summaryData = await db('transactions')
                .select(
                    db.raw('tran_date as summary_date'),
                    'station_id',
                    'bay_code'
                )
                .sum('amount as total_amount')
                .count('id as total_transactions')
                .sum('op as total_op_time')
                .sum('foam as total_foam_time')
                // Dùng tran_date (generated+indexed) thay DATE() function
                .where('tran_date', today)
                .where('status', 'processed')
                .groupBy('tran_date', 'station_id', 'bay_code');

            if (!summaryData || summaryData.length === 0) {
                console.log(`>>> [Aggregation]: Không có giao dịch nào để tổng hợp trong ngày ${today}`);
                return { success: true, count: 0 };
            }

            // 2. Thực hiện Upsert vào bảng daily_bay_summary
            // Sử dụng Promise.all để tối ưu hiệu suất nếu có nhiều trụ/trạm
            await Promise.all(summaryData.map(row => {
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

            console.log(`>>> [Aggregation]: Hoàn thành tổng hợp ${summaryData.length} bản ghi.`);
            
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

    async syncHistoryData(startDate: string, endDate: string) {
        try {
            console.log(`>>> [Sync]: Bắt đầu quét dữ liệu từ ${startDate} đến ${endDate}`);

            // 1. Lấy dữ liệu tổng hợp theo từng ngày trong khoảng thời gian
            // Tối ưu: dùng tran_date (generated column, có index) thay DATE(created_at)
            const historyData = await db('transactions')
                .select(
                    db.raw('tran_date as summary_date'),
                    'station_id',
                    'bay_code'
                )
                .sum('amount as total_amount')
                .count('id as total_transactions')
                .sum('op as total_op_time')
                .sum('foam as total_foam_time')
                // tran_date có index → MySQL dùng Index Range Scan
                .whereBetween('tran_date', [startDate, endDate])
                .where('status', 'processed')
                .groupBy('tran_date', 'station_id', 'bay_code');

            if (!historyData || historyData.length === 0) {
                console.log(">>> [Sync]: Không tìm thấy dữ liệu cũ.");
                return;
            }

            // 2. Insert/Update vào bảng summary
            for (const row of historyData) {
                await db('daily_bay_summary')
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
            }

            console.log(`>>> [Sync]: Đã đồng bộ xong ${historyData.length} dòng dữ liệu lịch sử.`);
        } catch (error) {
            console.error(">>> [Sync Error]:", error);
        }
    }

    async checkAndSyncIfMissing() {
        try {
            console.log(">>> [Auto-Sync]: Bắt đầu kiểm tra toàn diện dữ liệu...");

            // 1. Lấy tất cả các ngày thực tế ĐANG CÓ giao dịch trong bảng transactions
            // Tối ưu: dùng tran_date (generated column, có index) thay DATE(created_at)
            const distinctDaysInTrans = await db('transactions')
                .distinct(db.raw('tran_date as date'))
                .where('status', 'processed')
                .orderBy('tran_date', 'asc');

            if (distinctDaysInTrans.length === 0) {
                console.log(">>> [Auto-Sync]: Không có giao dịch nào để xử lý.");
                return;
            }

            // 2. Lấy tất cả các ngày ĐÃ ĐƯỢC tổng hợp trong bảng summary
            const existingDaysInSummary = await db('daily_bay_summary')
                .distinct('summary_date')
                .then(rows => rows.map(r => dayjs(r.summary_date).format('YYYY-MM-DD')));

            // 3. Tìm các ngày có giao dịch nhưng chưa có trong summary (hoặc ngày hôm nay để cập nhật mới nhất)
            const today = dayjs().format('YYYY-MM-DD');
            const missingDays = distinctDaysInTrans
                .map(r => dayjs(r.date).format('YYYY-MM-DD'))
                .filter(date => !existingDaysInSummary.includes(date) || date === today);

            if (missingDays.length > 0) {
                console.log(`>>> [Auto-Sync]: Phát hiện ${missingDays.length} ngày cần đồng bộ:`, missingDays);

                // 4. Chạy bù cho từng ngày còn thiếu
                // Sử dụng for...of để tránh quá tải database nếu số lượng ngày thiếu quá lớn
                for (const date of missingDays) {
                    console.log(`>>> [Auto-Sync]: Đang xử lý ngày ${date}...`);
                    await this.syncHistoryData(date, date); 
                }
                
                console.log(">>> [Auto-Sync]: Hoàn thành đồng bộ tất cả các ngày thiếu.");
            } else {
                console.log(">>> [Auto-Sync]: Dữ liệu đã đầy đủ, không có ngày nào bị thiếu.");
            }
        } catch (error) {
            console.error(">>> [Auto-Sync Error]:", error);
        }
    }

    async rebuildAllHistoryData() {
        try {
            console.log(`>>> [Rebuild]: BẮT ĐẦU LÀM SẠCH VÀ TÍNH TOÁN LẠI TOÀN BỘ...`);

            // 1. Xóa toàn bộ dữ liệu cũ
            await db('daily_bay_summary').truncate();
            console.log(">>> [Rebuild]: Đã xóa sạch bảng daily_bay_summary.");

            // 2. Định nghĩa câu lệnh SQL thuần
            // Chú ý: Group by phải có đầy đủ 3 thành phần: Ngày, Trạm, Cầu
            // Tối ưu: dùng tran_date (generated column, có index) thay DATE(created_at)
            // → MySQL dùng Index Scan trên tran_date thay vì Full Table Scan
            const fullSql = `
                INSERT INTO daily_bay_summary 
                (summary_date, station_id, bay_code, total_amount, total_transactions, total_op_time, total_foam_time, last_updated_at)
                SELECT 
                    tran_date as summary_date, 
                    station_id, 
                    bay_code, 
                    SUM(amount) as total_amount, 
                    COUNT(id) as total_transactions, 
                    SUM(op) as total_op_time, 
                    SUM(foam) as total_foam_time, 
                    NOW() as last_updated_at 
                FROM transactions 
                WHERE status = 'processed' 
                GROUP BY tran_date, station_id, bay_code
            `;

            // 3. Thực thi
            await db.raw(fullSql);

            console.log(`>>> [Rebuild]: Hoàn tất tính toán lại toàn bộ dữ liệu thành công!`);

        } catch (error) {
            console.error(">>> [Rebuild Error]:", error);
        }
    }
}