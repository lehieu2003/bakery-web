// One-off admin password rotation for admin@bakeryshop.com.
//
// Default: generate a fresh random password (old behavior).
// With --set <password>: set an exact password chosen by the owner
// (e.g. the demo password admin123) — used 2026-10-07 on Hieu's explicit
// decision to keep a memorable password for testing (audit finding #7 stays
// open until real production).
//
// The new plaintext prints to stdout exactly once and is never stored.
//
// Usage:
//   set -a; source .env; set +a
//   pnpm exec tsx scripts/rotate-admin-password.ts [--set <password>]

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/password';
import crypto from 'crypto';

const EMAIL = 'admin@bakeryshop.com';

// 16 chars from an unambiguous alphabet (no 0/O/1/l/I) — long enough to be
// strong, short enough to type into the mobile app login.
function generatePassword(length = 16): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

async function main() {
  const prisma = new PrismaClient();

  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`Admin user not found: ${EMAIL}`);
  if (user.role !== 'ADMIN') throw new Error(`User ${EMAIL} is not ADMIN`);

  const setIndex = process.argv.indexOf('--set');
  const explicit = setIndex !== -1 ? process.argv[setIndex + 1] : undefined;
  if (explicit !== undefined && explicit.length < 8) {
    throw new Error('--set password must be at least 8 characters');
  }

  const newPassword = explicit ?? generatePassword();
  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { email: EMAIL },
    data: { password: newHash },
  });

  console.log('PASSWORD:', newPassword);
  console.log('(login smoke: use this with', EMAIL, 'on /api/auth/login)');
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('❌ Rotation failed:', e.message ?? e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
