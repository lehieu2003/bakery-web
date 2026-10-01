import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

const SESSION_EXPIRY_DAYS = 30;

export type RotateSessionDeps = {
  findSessionByToken: (token: string) => Promise<{
    id: string;
    userId: string;
    revokedAt: Date | null;
    expiresAt: Date;
    user: { isActive: boolean; emailVerifiedAt: Date | null };
  } | null>;
  revokeSession: (id: string, revokedAt: Date) => Promise<number>;
  createSession: (
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ) => Promise<{ token: string; expiresAt: Date }>;
  revokeAllUserSessions: (userId: string) => Promise<void>;
  now: () => Date;
};

export type RotateSessionResult =
  | { status: 'rotated'; token: string; expiresAt: Date }
  | { status: 'replayed' }
  | { status: 'unauthorized' };

/**
 * Single-use refresh rotation for the opaque session token.
 *
 * Rule 1 — issuing a new token revokes the old one (same transaction).
 * Rule 2 — each token is single use: the revoke is conditional on
 * `revokedAt IS NULL`; if the conditional update loses (count 0) the token
 * was already consumed, which is a replay/theft signal and revokes ALL
 * sessions of that user.
 */
export async function rotateSession(
  input: { token: string; userAgent?: string; ipAddress?: string },
  deps: RotateSessionDeps,
): Promise<RotateSessionResult> {
  const session = await deps.findSessionByToken(input.token);

  if (!session) {
    return { status: 'unauthorized' };
  }

  if (session.revokedAt !== null) {
    // Replay of an already-consumed token — treat as theft and kill every
    // session belonging to this user.
    await deps.revokeAllUserSessions(session.userId);
    return { status: 'replayed' };
  }

  if (session.expiresAt < deps.now()) {
    return { status: 'unauthorized' };
  }

  if (!session.user.isActive || !session.user.emailVerifiedAt) {
    return { status: 'unauthorized' };
  }

  const revokedAt = deps.now();
  const revokedCount = await deps.revokeSession(session.id, revokedAt);
  if (revokedCount === 0) {
    // Lost a concurrent rotation race — the token was consumed elsewhere.
    await deps.revokeAllUserSessions(session.userId);
    return { status: 'replayed' };
  }

  const created = await deps.createSession(
    session.userId,
    input.userAgent,
    input.ipAddress,
  );

  return { status: 'rotated', token: created.token, expiresAt: created.expiresAt };
}

/**
 * Prisma-backed deps for rotateSession. The revoke is conditional
 * (revokedAt must still be NULL) so concurrent refreshes cannot both win.
 */
export function createPrismaRotationDeps() {
  return {
    findSessionByToken: (token: string) =>
      prisma.session.findUnique({
        where: { token },
        select: {
          id: true,
          userId: true,
          revokedAt: true,
          expiresAt: true,
          user: { select: { isActive: true, emailVerifiedAt: true } },
        },
      }),
    revokeSession: (id: string, revokedAt: Date) =>
      prisma.session
        .updateMany({
          where: { id, revokedAt: null },
          data: { revokedAt },
        })
        .then((result) => result.count),
    createSession: (
      userId: string,
      userAgent?: string,
      ipAddress?: string,
    ) => {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(
        Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      );
      return prisma.session
        .create({ data: { userId, token, expiresAt, userAgent, ipAddress } })
        .then((created) => ({ token: created.token, expiresAt: created.expiresAt }));
    },
    revokeAllUserSessions: (userId: string) =>
      prisma.session
        .updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        .then(() => undefined),
    now: () => new Date(),
  } satisfies RotateSessionDeps;
}
