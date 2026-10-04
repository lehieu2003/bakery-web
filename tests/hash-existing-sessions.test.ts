import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  migrateSessions,
  hashSessionToken,
} from '../scripts/hash-existing-sessions.mjs';

const sha256 = (input: string) =>
  crypto.createHash('sha256').update(input, 'utf8').digest('hex');

type Row = { id: string; token: string };
type Write = { id: string; token: string };

type FakeDb = {
  session: {
    findMany: () => Promise<Row[]>;
    updateMany: (args: {
      where: { id: string };
      data: { token: string };
    }) => Promise<{ count: number }>;
  };
  $transaction: (
    fn: (tx: FakeDb) => Promise<void>,
    opts?: unknown,
  ) => Promise<void>;
};

/** Minimal Prisma stand-in: records every updateMany and applies it in-memory. */
function makeFakeDb(rows: Row[]) {
  const table = rows.map((row) => ({ ...row }));
  const writes: Write[] = [];
  const db: FakeDb = {
    session: {
      findMany: async () => table.map(({ id, token }) => ({ id, token })),
      updateMany: async ({ where, data }) => {
        writes.push({ id: where.id, token: data.token });
        const row = table.find((r) => r.id === where.id);
        if (row) row.token = data.token;
        return { count: 1 };
      },
    },
    $transaction: async (fn) => fn(db),
  };
  return { db, table, writes };
}

test('migrateSessions converts every raw token to its SHA-256 hash keyed by id', async () => {
  const raw1 = crypto.randomBytes(32).toString('hex');
  const raw2 = crypto.randomBytes(32).toString('hex');
  const { db, table, writes } = makeFakeDb([
    { id: 's1', token: raw1 },
    { id: 's2', token: raw2 },
  ]);

  const result = await migrateSessions(db);

  assert.equal(result.total, 2);
  assert.equal(result.updated, 2);
  assert.deepEqual(
    writes.map((w) => ({ id: w.id, token: w.token })),
    [
      { id: 's1', token: sha256(raw1) },
      { id: 's2', token: sha256(raw2) },
    ],
  );
  assert.equal(table[0].token, sha256(raw1));
  assert.equal(table[1].token, sha256(raw2));
  assert.equal(hashSessionToken(raw1), table[0].token);
});

test('migrateSessions dry run issues zero writes and leaves rows untouched', async () => {
  const raw = crypto.randomBytes(32).toString('hex');
  const { db, table, writes } = makeFakeDb([{ id: 's1', token: raw }]);

  const result = await migrateSessions(db, { dryRun: true });

  assert.equal(result.total, 1);
  assert.equal(result.updated, 0);
  assert.equal(writes.length, 0);
  assert.equal(table[0].token, raw);
});

test('already-hashed 64-hex rows are hashed again (hash-ALL-rows ruling, no skip)', async () => {
  const alreadyHashed = sha256(crypto.randomBytes(32).toString('hex'));
  const { db, writes } = makeFakeDb([{ id: 's2', token: alreadyHashed }]);

  await migrateSessions(db);

  assert.equal(writes.length, 1);
  assert.equal(writes[0].id, 's2');
  assert.equal(writes[0].token, sha256(alreadyHashed));
  assert.notEqual(writes[0].token, alreadyHashed);
});
