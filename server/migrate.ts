import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QueryTypes } from 'sequelize';
import { sequelize, assertDb } from './db.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.join(__dirname, 'sql');

async function ensureMigrationsTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function appliedIds(): Promise<Set<string>> {
  const rows = (await sequelize.query(`SELECT id FROM schema_migrations ORDER BY id`, {
    type: QueryTypes.SELECT,
  })) as Array<{ id: string }>;
  return new Set(rows.map((r) => r.id));
}

async function migrate() {
  if (!process.env.DATABASE_URL && !process.env.pg_connStr1) {
    console.log('Skipping migrations: DATABASE_URL not set');
    return;
  }

  await assertDb();
  await ensureMigrationsTable();

  const done = await appliedIds();
  const files = fs
    .readdirSync(sqlDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let applied = 0;
  for (const file of files) {
    if (done.has(file)) {
      console.log(`skip  ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(sqlDir, file), 'utf8');
    console.log(`apply ${file}`);
    await sequelize.query(sql);
    await sequelize.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, {
      bind: [file],
    });
    applied += 1;
  }

  console.log(
    applied === 0
      ? 'Migrations up to date.'
      : `Applied ${applied} migration(s).`
  );
  await sequelize.close();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
