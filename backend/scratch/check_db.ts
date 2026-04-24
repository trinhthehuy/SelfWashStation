
import db from '../src/db/index.js';

async function main() {
    console.log('--- STATIONS ---');
    const stations = await db('stations').select('*').limit(5);
    console.table(stations);

    console.log('--- TRANSACTIONS ---');
    const transactions = await db('transactions').select('*').orderBy('id', 'desc').limit(5);
    console.table(transactions);

    await db.destroy();
}

main();
