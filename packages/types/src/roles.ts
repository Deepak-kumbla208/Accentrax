/** System roles. Custom roles may also exist in the DB. */
export const SystemRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  OFFICE_ADMIN: 'OFFICE_ADMIN',
  USER: 'USER',
} as const;

export type SystemRole = (typeof SystemRole)[keyof typeof SystemRole];

export const SYSTEM_ROLES: SystemRole[] = [
  SystemRole.SUPER_ADMIN,
  SystemRole.OFFICE_ADMIN,
  SystemRole.USER,
];
