/**
 * Idempotent database seed. Safe to run repeatedly (`pnpm prisma:seed`).
 * Seeds: permission catalog → system roles (per the design's permission
 * matrix, docs/DESIGN.md §7) → the initial Super Admin user.
 */
import * as argon2 from 'argon2';
import { PERMISSION_CATALOG, SystemRole, type Permission } from '@accentrax/types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALL_PERMISSIONS = PERMISSION_CATALOG.map((p) => p.key);

const OFFICE_ADMIN_PERMISSIONS: Permission[] = [
  'invoice.view_own',
  'expense.create',
  'expense.view_own',
  'expense.view_company',
  'expense.approve',
  'expense.reject',
  'expense.mark_paid',
  'expense.reimburse',
  'dashboard.view',
  'reports.view',
  'export',
  'ocr.use',
];

const USER_PERMISSIONS: Permission[] = ['invoice.view_own', 'expense.create', 'expense.view_own', 'ocr.use'];

const ROLE_SEED: Record<SystemRole, Permission[]> = {
  [SystemRole.SUPER_ADMIN]: ALL_PERMISSIONS,
  [SystemRole.OFFICE_ADMIN]: OFFICE_ADMIN_PERMISSIONS,
  [SystemRole.USER]: USER_PERMISSIONS,
};

async function seedPermissions() {
  for (const perm of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      create: { key: perm.key, label: perm.label, group: perm.group },
      update: { label: perm.label, group: perm.group },
    });
  }
  console.log(`[seed] permissions: ${PERMISSION_CATALOG.length} upserted`);
}

async function seedRoles() {
  const permissions = await prisma.permission.findMany();
  const byKey = new Map(permissions.map((p) => [p.key, p.id]));

  for (const [roleName, permissionKeys] of Object.entries(ROLE_SEED)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      create: { name: roleName, isSystem: true },
      update: { isSystem: true },
    });

    const permissionIds = permissionKeys.map((key) => byKey.get(key)).filter((id): id is string => !!id);

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
      }),
    ]);
    console.log(`[seed] role ${roleName}: ${permissionIds.length} permissions`);
  }
}

async function seedSuperAdmin() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@accentrax.local';
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
  const name = process.env.ADMIN_NAME ?? 'Super Admin';

  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    console.log(`[seed] super admin ${email} already exists — skipping`);
    return;
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.create({ data: { email, name, passwordHash } });

  const role = await prisma.role.findFirstOrThrow({ where: { name: SystemRole.SUPER_ADMIN } });
  await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });

  console.log(`[seed] super admin created: ${email}`);
}

async function main() {
  await seedPermissions();
  await seedRoles();
  await seedSuperAdmin();
  console.log('[seed] done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
