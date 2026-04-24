// scripts/seed-transactions.ts
import db from '../src/db/index.js';
import { aggregationService } from '../src/services/aggregation.service.js';
import dayjs from 'dayjs';

async function main() {
    console.log('🌱 Bắt đầu seeding dữ liệu giao dịch 7 ngày gần nhất...');

    try {
        // 1. Lấy danh sách trạm và trụ có sẵn
        const stations = await db('stations').select('id', 'station_name').where('is_active', 1);
        const bays = await db('wash_bays').select('station_id', 'bay_code').where('bay_status', 1);

        if (stations.length === 0 || bays.length === 0) {
            console.error('❌ Không tìm thấy trạm hoặc trụ hoạt động nào để seed.');
            return;
        }

        console.log(`📍 Tìm thấy ${stations.length} trạm và ${bays.length} trụ.`);

        // 2. Xóa dữ liệu cũ của 7 ngày gần nhất để test sạch
        const startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
        await db('transactions')
            .where('created_at', '>=', startDate)
            .where('is_test', true)
            .del();
        
        // Quan trọng: Rebuild lại summary sau khi xóa để đảm bảo xuất phát điểm sạch
        await aggregationService.rebuildAllHistoryData();

        const amounts = [10000, 20000, 30000, 50000];
        let totalInserted = 0;
        let totalAmountExpected = 0;

        // 3. Tạo giao dịch cho mỗi ngày trong 7 ngày qua
        for (let i = 0; i <= 7; i++) {
            const date = dayjs().subtract(i, 'day');
            console.log(`📅 Đang seed cho ngày ${date.format('YYYY-MM-DD')}...`);

            for (const station of stations) {
                const stationBays = bays.filter(b => b.station_id === station.id);
                if (stationBays.length === 0) continue;

                const numTransactions = Math.floor(Math.random() * 2) + 1; // 1-2 giao dịch mỗi trạm/ngày

                for (let j = 0; j < numTransactions; j++) {
                    const bay = stationBays[Math.floor(Math.random() * stationBays.length)];
                    const amount = amounts[Math.floor(Math.random() * amounts.length)];
                    const hour = Math.floor(Math.random() * 24);
                    const txTime = date.hour(hour).minute(Math.floor(Math.random() * 60)).second(Math.floor(Math.random() * 60)).format('YYYY-MM-DD HH:mm:ss');

                    const [txId] = await db('transactions').insert({
                        station_id: bay.station_id,
                        bay_code: bay.bay_code,
                        amount: amount,
                        status: 'processed',
                        source: 'manual',
                        is_test: true,
                        transaction_id: `SEED-${date.format('YYYYMMDD')}-${station.id}-${j}`,
                        transaction_time: txTime,
                        created_at: txTime,
                        op: Math.floor(Math.random() * 300) + 300, 
                        foam: Math.floor(Math.random() * 60) + 60,
                        content: JSON.stringify({ message: 'Seed data', station_name: station.station_name })
                    });

                    // Lấy lại record vừa insert để truyền vào incrementSummary
                    const tx = await db('transactions').where('id', txId).first();
                    await aggregationService.incrementSummary(tx);

                    totalInserted++;
                    totalAmountExpected += amount;
                }
            }
        }

        console.log(`✅ Đã seed xong ${totalInserted} giao dịch. Tổng số tiền: ${totalAmountExpected.toLocaleString()} VNĐ.`);

        // 4. KIỂM TRA ĐỐI SOÁT
        console.log('\n🔍 Bắt đầu đối soát dữ liệu giữa bảng Transactions và Summary...');
        
        const rawStats = await db('transactions')
            .where('status', 'processed')
            .select(db.raw('SUM(amount) as total_amount'), db.raw('COUNT(*) as total_count'))
            .first();

        const summaryStats = await db('hourly_bay_summary')
            .select(db.raw('SUM(total_amount) as total_amount'), db.raw('SUM(total_transactions) as total_count'))
            .first();

        console.log('--- KẾT QUẢ ĐỐI SOÁT ---');
        console.log(`Bảng Transactions: Amount=${Number(rawStats.total_amount).toLocaleString()}, Count=${rawStats.total_count}`);
        console.log(`Bảng Summary     : Amount=${Number(summaryStats.total_amount).toLocaleString()}, Count=${summaryStats.total_count}`);

        if (Number(rawStats.total_amount) === Number(summaryStats.total_amount) && Number(rawStats.total_count) === Number(summaryStats.total_count)) {
            console.log('🎉 KHỚP 100%! Cơ chế Incremental Update hoạt động hoàn hảo.');
        } else {
            console.error('❌ CÓ SAI LỆCH! Cần kiểm tra lại logic.');
        }

    } catch (error) {
        console.error('❌ Lỗi seeding:', error);
    } finally {
        await db.destroy();
        process.exit(0);
    }
}

main();
