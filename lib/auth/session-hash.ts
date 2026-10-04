import crypto from 'node:crypto';

/**
 * Session tokens are stored hashed at rest (SHA-256 hex, 64 chars).
 *
 * The value the client holds — the httpOnly `bakery_session` cookie or the
 * Bearer token — is always the RAW random token. Every write to
 * `Session.token` and every DB lookup by token must convert the presented
 * token through this function first. Kept dependency-free so it can be
 * imported by scripts and tests without pulling in Prisma or Next.js.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}
