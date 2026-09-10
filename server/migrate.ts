import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sequelize, assertDb } from './db.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  await assertDb();
  const sqlPath = path.join(__dirname, 'sql', '001_init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await sequelize.query(sql);
  console.log('Migration 001_init.sql applied successfully.');
  await sequelize.close();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
