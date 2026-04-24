import { aggregationService } from '../src/services/aggregation.service.js';
import { initDb } from '../src/db/index.js';

async function run() {
    await initDb();
    console.log("DB Initialized");
    await aggregationService.rebuildAllHistoryData();
    console.log("Done");
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
