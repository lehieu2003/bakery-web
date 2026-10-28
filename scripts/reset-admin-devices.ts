// Break-glass for admin device trust (lib/auth/admin-device.ts): forgets an
// admin's trusted devices and signs out every session they have, on web and
// mobile. The next sign-in, from any device, needs the code emailed to the
// admin again.
//
// Use when a trusted device is lost or stolen and you cannot sign in to sign
// it out, or after a suspected compromise (rotate the password too:
// scripts/set-admin-password.ts).
//
// Usage:
//   set -a; source .env; set +a
//   pnpm exec tsx scripts/reset-admin-devices.ts admin@example.com

import { PrismaClient } from '@prisma/client';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error('Usage: reset-admin-devices.ts <admin email>');

  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });
  if (!user) throw new Error(`User not found: ${email}`);
  if (user.role !== 'ADMIN') throw new Error(`Not an admin account: ${email}`);

  const now = new Date();
  const [devices, sessions, challenges] = await prisma.$transaction([
    prisma.trustedDevice.deleteMany({ where: { userId: user.id } }),
    prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: now },
    }),
    prisma.loginChallenge.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    }),
  ]);

  console.log(
    `✅ ${email}: ${devices.count} trusted device(s) removed, ${sessions.count} session(s) signed out, ${challenges.count} pending code(s) voided.`,
  );
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('❌ Reset failed:', e.message ?? e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
