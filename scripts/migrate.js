import { pool, migrate } from '../server/express/db.js';

await migrate();
console.log('Схема применена');
await pool.end();
