// Replays a data-export.json (see scripts/supabase-export.mjs) into the
// database pointed at by DATABASE_URL — the NEW Supabase project after
// `npx prisma migrate deploy` has created the schema there.
//
// Usage: node --env-file=.env scripts/supabase-import.mjs [export.json]
// Safety: refuses to run when target tables already hold rows
//         (override with --allow-nonempty).

import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'node:fs';

const prisma = new PrismaClient();
const allowNonEmpty = process.argv.includes('--allow-nonempty');
const exportPath =
  process.argv.find((arg) => arg.endsWith('.json')) ??
  'supabase-migration/data-export.json';

const SKIP_TABLES = new Set(['_prisma_migrations']);

const isTimestamp = (type) =>
  type.includes('timestamp') || type === 'date' || type === 'time';
const isJson = (type) => type === 'jsonb' || type === 'json';

function convertValue(rawValue, dataType) {
  if (rawValue === null || rawValue === undefined) return null;
  if (isTimestamp(dataType) && typeof rawValue === 'string') {
    return new Date(rawValue);
  }
  if (isJson(dataType) && typeof rawValue === 'object') {
    return JSON.stringify(rawValue);
  }
  return rawValue;
}

async function main() {
  if (!existsSync(exportPath)) {
    throw new Error(`Export file not found: ${exportPath}`);
  }
  const dump = JSON.parse(readFileSync(exportPath, 'utf8'));
  const tableNames = Object.keys(dump.tables);

  // ── Safety: the target must be an empty schema (fresh migrate deploy) ──
  for (const name of tableNames) {
    const [{ count }] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS count FROM "${name}"`,
    );
    if (count > 0 && !allowNonEmpty) {
      throw new Error(
        `Table "${name}" already has ${count} rows. Use --allow-nonempty to continue anyway.`,
      );
    }
  }

  // ── Column types: enum columns need an explicit cast on their param ──
  const udtByColumn = new Map();
  const columnTypes = await prisma.$queryRaw`
    SELECT table_name AS table_name, column_name AS column_name, udt_name AS udt_name,
           data_type AS data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `;
  for (const col of columnTypes) {
    udtByColumn.set(`${col.table_name}.${col.column_name}`, col);
  }
  const castFor = (tableName, columnName) => {
    const col = udtByColumn.get(`${tableName}.${columnName}`);
    if (!col) return '';
    if (col.data_type === 'USER-DEFINED') return `::"${col.udt_name}"`;
    // Prisma sends these param shapes as text — cast to the column type.
    if (col.udt_name === 'numeric' || col.udt_name === 'decimal') return '::numeric';
    if (col.udt_name === 'jsonb' || col.udt_name === 'json') return '::jsonb';
    if (col.udt_name === 'int8') return '::bigint';
    if (col.udt_name === 'float8' || col.udt_name === 'float4') return '::float8';
    return '';
  };

  // ── Dependency order from the target schema's foreign keys ──
  const fkRows = await prisma.$queryRaw`
    SELECT tc.table_name AS table_name, ccu.table_name AS ref_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  `;

  const selfRefTables = new Set(
    fkRows.filter((fk) => fk.table_name === fk.ref_table).map((fk) => fk.table_name),
  );
  const deps = new Map(
    tableNames.map((name) => [
      name,
      fkRows
        .filter((fk) => fk.table_name === name && fk.ref_table !== name)
        .map((fk) => fk.ref_table)
        .filter((ref) => tableNames.includes(ref)),
    ]),
  );

  const ordered = [];
  const done = new Set();
  let pending = tableNames.filter((name) => !SKIP_TABLES.has(name));
  while (pending.length > 0) {
    const ready = pending.filter((name) =>
      (deps.get(name) ?? []).every((dep) => done.has(dep) || selfRefTables.has(dep)),
    );
    if (ready.length === 0) {
      throw new Error(`Circular FK dependency between: ${pending.join(', ')}`);
    }
    ready.forEach((name) => {
      ordered.push(name);
      done.add(name);
    });
    pending = pending.filter((name) => !done.has(name));
  }

  // ── Build multi-row INSERT statements ──
  const statements = [];
  for (const name of ordered) {
    const { columns, rows } = dump.tables[name];
    if (rows.length === 0) continue;

    const selfFkColumn = fkRows.some(
      (fk) => fk.table_name === name && fk.ref_table === name,
    )
      ? (
          await prisma.$queryRaw`
            SELECT kcu.column_name AS name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = ${name}`
        )[0]?.name
      : null;

// --- self-referencing tables: iterative parent-first passes ---
    if (selfFkColumn) {
      const colNames = columns.map(({ name: col }) => col);
      const remaining = [...rows];
      while (remaining.length > 0) {
        const readyRows = remaining.filter(
          (row) => row[selfFkColumn] === null || !remaining.some((other) =>
            other.id !== undefined && row[selfFkColumn] === other.id),
        );
        if (readyRows.length === 0) {
          throw new Error(`Cannot resolve self-reference order for "${name}"`);
        }
        readyRows.forEach((row) => remaining.splice(remaining.indexOf(row), 1));
        statements.push(buildInsert(name, columns, readyRows));
      }
      continue;
    }

    for (let i = 0; i < rows.length; i += 50) {
      statements.push(buildInsert(name, columns, rows.slice(i, i + 50)));
    }
  }

  function buildInsert(name, columns, rows) {
    const values = [];
    const placeholders = rows.map((row) => {
      const rowPlaceholders = columns.map(({ name: col, type }) => {
        values.push(convertValue(row[col], type));
        return `$${values.length}${castFor(name, col)}`;
      });
      return `(${rowPlaceholders.join(', ')})`;
    });
    const columnList = columns.map(({ name: col }) => `"${col}"`).join(', ');
    return prisma.$executeRawUnsafe(
      `INSERT INTO "${name}" (${columnList}) VALUES ${placeholders.join(', ')}`,
      ...values,
    );
  }

  // ── Run everything in one batched transaction ──
  console.log(`🚚 Importing ${tableNames.length} tables with ${statements.length} batched statements...`);
  await prisma.$transaction(statements);

  // ── Verify row counts ──
  let mismatches = 0;
  for (const name of ordered) {
    const expected = dump.tables[name].rows.length;
    const [{ count }] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS count FROM "${name}"`,
    );
    if (count !== expected) {
      mismatches += 1;
      console.error(`❌ ${name}: expected ${expected}, found ${count}`);
    }
  }

  if (mismatches > 0) {
    throw new Error(`${mismatches} tables have mismatched row counts`);
  }
  console.log(`🎉 Import verified — every table matches the export row-for-row.`);
}

main()
  .catch((e) => {
    console.error('❌ Import failed:', e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
