import type { UserRole } from '@prisma/client';

export type Capability =
  | 'session:authenticated'
  | 'admin:access'
  | 'orders:read'
  | 'orders:read:any'
  | 'orders:write'
  | 'users:manage';

export const ROLE_CAPABILITIES: Partial<Record<UserRole, readonly Capability[]>> = {
  ADMIN: ['session:authenticated', 'admin:access', 'orders:read:any', 'orders:write', 'users:manage'],
  CUSTOMER: ['session:authenticated', 'orders:read', 'orders:write'],
};

export const POLICIES = {
  ADMIN_ONLY: ['admin:access'],
  AUTHENTICATED_USER: ['session:authenticated'],
  ORDERS_READ: ['orders:read', 'orders:read:any'],
  ORDERS_WRITE: ['orders:write'],
  ADMIN_MANAGE_USERS: ['users:manage'],
} as const satisfies Record<string, readonly Capability[]>;

export type PolicyKey = keyof typeof POLICIES;

export function getRoleCapabilities(role: UserRole): readonly Capability[] {
  return ROLE_CAPABILITIES[role] ?? [];
}

export function hasAnyCapability(
  role: UserRole,
  requiredCapabilities: readonly Capability[],
) {
  const roleCapabilities = getRoleCapabilities(role);
  return requiredCapabilities.some((capability) =>
    roleCapabilities.includes(capability),
  );
}

export function hasPolicyAccess(role: UserRole, policyKey: PolicyKey) {
  return hasAnyCapability(role, POLICIES[policyKey]);
}
