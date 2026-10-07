// One-off admin password re-rotation for admin@bakeryshop.com.
//
// Unlike set-admin-password.ts (which only rotates away from the legacy demo
// password), this one re-rotates from ANY current password — for when the
// previous plaintext was lost. The new plaintext prints to stdout exactly
// once and is never stored.
//
// Usage:
//   set -a; source .env; set +a
//   pnpm exec tsx scripts/rotate-admin-password.ts

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

  const newPassword = generatePassword();
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
