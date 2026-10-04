// One-off helper: export every public table of the CURRENT DATABASE_URL to a
// single JSON file, so the data can be replayed into a fresh Supabase project
// (different region) after `prisma migrate deploy`.
//
// Usage: node --env-file=.env scripts/supabase-export.mjs [output.json]

import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const prisma = new PrismaClient();
const output = process.argv[2] ?? 'supabase-migration/data-export.json';

const SKIP_TABLES = new Set(['_prisma_migrations']);

async function main() {
  const tables = (
    await prisma.$queryRaw`
      SELECT table_name AS name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '\\_%'
      ORDER BY table_name
    `
  ).filter((t) => !SKIP_TABLES.has(t.name));

  const dump = { exportedAt: new Date().toISOString(), tables: {} };

  for (const { name } of tables) {
    const columns = await prisma.$queryRaw`
      SELECT column_name AS name, data_type AS type, is_nullable AS nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${name}
      ORDER BY ordinal_position
    `;
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "${name}"`,
    );
    dump.tables[name] = { columns, rows };
    console.log(`✅ ${name}: ${rows.length} rows`);
  }

  const tableCount = Object.keys(dump.tables).length;
  const rowCount = Object.values(dump.tables).reduce(
    (sum, t) => sum + t.rows.length,
    0,
  );
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(dump));
  console.log(`\n🎉 Exported ${tableCount} tables / ${rowCount} rows → ${output}`);
}

main()
  .catch((e) => {
    console.error('❌ Export failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
