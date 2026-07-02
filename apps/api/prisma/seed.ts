/**
 * Database seed entrypoint.
 * Phase 0: no-op placeholder. Phase 1 seeds system roles, the full permission
 * catalog (@accentrax/types PERMISSION_CATALOG), and the initial Super Admin.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[seed] Phase 0 — nothing to seed yet.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
