// One-off admin password rotation for admin@bakeryshop.com.
//
// Usage:
//   set -a; source .env; set +a
//   pnpm exec tsx scripts/set-admin-password.ts --generate
//
// Verifies the CURRENT password is still the demo `admin123` before rotating
// (proves we are touching the intended account), then stores the PBKDF2 hash
// of a freshly generated password. The plaintext prints to stdout exactly once.

import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '../lib/password';
import crypto from 'crypto';

const EMAIL = 'admin@bakeryshop.com';
const LEGACY_DEMO_PASSWORD = 'admin123';

// 24 chars from an unambiguous alphabet (no 0/O/1/l/I).
function generatePassword(length = 24): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

async function main() {
  const prisma = new PrismaClient();

  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`Admin user not found: ${EMAIL}`);
  if (!user.password) throw new Error(`Admin user has no password set: ${EMAIL}`);

  const currentIsDemo = await verifyPassword(LEGACY_DEMO_PASSWORD, user.password);
  if (!currentIsDemo) {
    throw new Error(
      'Current admin password is NOT the demo password — already rotated? Aborting to avoid clobbering an unknown password.',
    );
  }

  const newPassword = generatePassword(24);
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
