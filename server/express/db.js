import pg from 'pg';
import schema from './schema.js';

// globalThis: в dev модули перезагружаются, а пул и бот должны остаться одни
export const pool = (globalThis.__tgmPool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL }));
if (!globalThis.__tgmPoolHandler) {
  globalThis.__tgmPoolHandler = true;
  pool.on('error', (e) => console.error('PG pool:', e.message));
}

export const q = (text, params) => pool.query(text, params);
export const migrate = () => pool.query(schema);
