/**
 * One-shot migration: hash existing session tokens at rest.
 *
 * Run ONCE, immediately after deploying the code that stores hashed tokens:
 *
 *   node --env-file=.env scripts/hash-existing-sessions.mjs
 *
 * Preview without writing:
 *
 *   node --env-file=.env scripts/hash-existing-sessions.mjs --dry-run
 *
 * IMPORTANT — why every row is converted (no "skip 64-hex" rule):
 * Raw session tokens are `crypto.randomBytes(32).toString('hex')`, which is
 * itself exactly 64 lowercase hex chars — indistinguishable in FORMAT from
 * their SHA-256 hash. A "skip rows that already look like a hash" guard
 * would therefore skip every row and silently disable the migration,
 * leaving raw tokens in the DB so no existing session could authenticate.
 * The only safe idempotency boundary is running this script exactly once.
 *
 * Safety properties:
 * - Hashing is bit-identical to lib/auth/session-hash.ts:
 *   SHA-256 over the UTF-8 token bytes, lowercase hex digest.
 * - All updates run inside a single interactive transaction: either every
 *   old raw token is converted or none is, so an interrupted run cannot
 *   leave a half-migrated table (re-running after a crash is then safe).
 * - Updates target rows by primary key `id`, never by token, so a
 *   concurrent login creating a new (already hashed) session cannot collide
 *   with the migration's WHERE clauses.
 *
 * Residual hazard: rows created BETWEEN the code deploy and this script
 * already hold hashed tokens; converting them again (double-hashing) would
 * break just those sessions (their users must log in again). Minimize the
 * window by running this script IMMEDIATELY after the deploy, and never
 * run it a second time.
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

/** Bit-identical to hashSessionToken() in lib/auth/session-hash.ts. */
export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Core migration logic, decoupled from Prisma so it can be dry-run against
 * a fixture. `db` must provide:
 *   session.findMany({ select: { id, token } }) -> rows
 *   $transaction(fn, opts)                      -> runs fn(db-tx) atomically
 * where db-tx provides session.updateMany({ where: { id }, data: { token } }).
 */
export async function migrateSessions(db, { dryRun = false, log = () => {} } = {}) {
  const rows = await db.session.findMany({ select: { id: true, token: true } });

  if (rows.length === 0) {
    log('No sessions found — nothing to migrate.');
    return { total: 0, updated: 0 };
  }

  const updates = rows.map((row) => ({
    id: row.id,
    token: hashSessionToken(row.token),
  }));

  log(`Found ${updates.length} session row(s).`);

  if (dryRun) {
    log('Dry run — no rows were written. Hashes that would be applied:');
    for (const u of updates) {
      log(`  ${u.id}: -> ${u.token}`);
    }
    return { total: updates.length, updated: 0 };
  }

  await db.$transaction(
    async (tx) => {
      for (const u of updates) {
        await tx.session.updateMany({
          where: { id: u.id },
          data: { token: u.token },
        });
      }
    },
    { timeout: 60_000, maxWait: 10_000 },
  );

  log(`Migrated ${updates.length} session row(s) to hashed tokens.`);
  return { total: updates.length, updated: updates.length };
}

function isMainModule() {
  try {
    return import.meta.url === new URL(`file://${process.argv[1]}`);
  } catch {
    return false;
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const prisma = new PrismaClient({
    log: ['error'],
  });

  try {
    const result = await migrateSessions(prisma, {
      dryRun,
      log: (line) => console.log(line),
    });

    if (dryRun) {
      console.log(`\nDry run complete: ${result.total} row(s) would be updated.`);
    } else {
      console.log(
        `\nDone: ${result.updated}/${result.total} session token(s) hashed. Do NOT run this script again.`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (isMainModule()) {
  main().catch((error) => {
    console.error('Session token migration FAILED:', error);
    console.error(
      'If some rows were already updated, do not simply re-run: rows converted in a failed partial run would be double-hashed. Inspect the Session table first.',
    );
    process.exitCode = 1;
  });
}
