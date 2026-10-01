import test from 'node:test';
import assert from 'node:assert/strict';
import { rotateSession } from '@/lib/auth/session-rotation';

const BASE_NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

type SessionRecord = {
  id: string;
  userId: string;
  token: string;
  revokedAt: Date | null;
  expiresAt: Date;
  user: { isActive: boolean; emailVerifiedAt: Date | null };
};

type DepsShape = NonNullable<Parameters<typeof rotateSession>[1]>;

function createWorld(options?: { sessions?: SessionRecord[] }) {
  let now = BASE_NOW;
  const sessions: SessionRecord[] = options?.sessions ?? [
    {
      id: 's-old',
      userId: 'u1',
      token: 'token-current',
      revokedAt: null,
      expiresAt: new Date(now + 20 * DAY),
      user: { isActive: true, emailVerifiedAt: new Date() },
    },
  ];
  const revoked: string[] = [];
  const created: string[] = [];

  const deps: DepsShape = {
    findSessionByToken: async (token: string) =>
      sessions.find((s) => s.token === token) ?? null,
    revokeSession: async (id: string, revokedAt: Date) => {
      const session = sessions.find((s) => s.id === id);
      if (!session || session.revokedAt !== null) return 0; // conditional update lost the race
      session.revokedAt = revokedAt;
      revoked.push(id);
      return 1;
    },
    createSession: async (userId: string) => {
      now += 1000;
      const token = `token-${created.length + 1}`;
      created.push(token);
      sessions.push({
        id: `s-${created.length + 1}`,
        userId,
        token,
        revokedAt: null,
        expiresAt: new Date(now + 30 * DAY),
        user: { isActive: true, emailVerifiedAt: new Date() },
      });
      return { token, expiresAt: new Date(now + 30 * DAY) };
    },
    revokeAllUserSessions: async (userId: string) => {
      for (const s of sessions) {
        if (s.userId === userId && s.revokedAt === null) {
          s.revokedAt = new Date();
          revoked.push(s.id);
        }
      }
    },
    now: () => new Date(now),
  };

  return {
    deps,
    sessions,
    revoked,
    created,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

test('rotation issues a fresh token and revokes the old one (rule 1)', async () => {
  const world = createWorld();
  const result = await rotateSession({ token: 'token-current' }, world.deps);

  assert.equal(result.status, 'rotated');
  if (result.status !== 'rotated') return;
  assert.notEqual(result.token, 'token-current');
  assert.deepEqual(world.revoked, ['s-old']);
  // Fresh 30-day expiry — at least 9 days beyond the old session's expiry
  assert.ok(
    result.expiresAt.getTime() >
      world.sessions[0].expiresAt.getTime() + 9 * DAY,
  );
});

test('unknown token is unauthorized', async () => {
  const world = createWorld();
  const result = await rotateSession({ token: 'token-unknown' }, world.deps);
  assert.equal(result.status, 'unauthorized');
});

test('expired session is unauthorized', async () => {
  const world = createWorld({
    sessions: [
      {
        id: 's-expired',
        userId: 'u1',
        token: 'token-expired',
        revokedAt: null,
        expiresAt: new Date(BASE_NOW - 1000),
        user: { isActive: true, emailVerifiedAt: new Date() },
      },
    ],
  });
  const result = await rotateSession({ token: 'token-expired' }, world.deps);
  assert.equal(result.status, 'unauthorized');
});

test('inactive user is unauthorized', async () => {
  const world = createWorld({
    sessions: [
      {
        id: 's-inactive',
        userId: 'u1',
        token: 'token-inactive',
        revokedAt: null,
        expiresAt: new Date(BASE_NOW + 20 * DAY),
        user: { isActive: false, emailVerifiedAt: new Date() },
      },
    ],
  });
  const result = await rotateSession({ token: 'token-inactive' }, world.deps);
  assert.equal(result.status, 'unauthorized');
});

test('replaying a consumed token revokes ALL sessions of that user (rule 2)', async () => {
  const world = createWorld();
  // First refresh consumes token-current
  await rotateSession({ token: 'token-current' }, world.deps);

  // Replay the consumed token — token theft signal
  const result = await rotateSession({ token: 'token-current' }, world.deps);

  assert.equal(result.status, 'replayed');
  // Every live session of the user must now be revoked
  const live = world.sessions.filter((s) => s.revokedAt === null);
  assert.equal(live.length, 0);
});

test('losing the conditional revoke race is treated as replay', async () => {
  const world = createWorld();
  // Simulate a concurrent rotation: revokeSession always reports the row was
  // already consumed (count 0)
  world.deps.revokeSession = async () => 0;

  const result = await rotateSession({ token: 'token-current' }, world.deps);
  assert.equal(result.status, 'replayed');
});
