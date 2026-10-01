import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRoleCapabilities,
  hasPolicyAccess,
  POLICIES,
  type PolicyKey,
} from '@/lib/authorization-policy';
import { requirePolicy as rbacRequirePolicy, AuthError } from '@/lib/rbac';

// The exact documented matrix — asserted explicitly, not derived from the
// code under test, so a capability regression breaks these assertions.
const EXPECTED_MATRIX: Record<string, Partial<Record<PolicyKey, boolean>>> = {
  ADMIN: {
    ADMIN_ONLY: true,
    AUTHENTICATED_USER: true,
    ORDERS_READ: true,
    ORDERS_WRITE: true,
    ADMIN_MANAGE_USERS: true,
  },
  CUSTOMER: {
    ADMIN_ONLY: false,
    AUTHENTICATED_USER: true,
    ORDERS_READ: true,
    ORDERS_WRITE: true,
    ADMIN_MANAGE_USERS: false,
  },
};

const ROLES = ['ADMIN', 'CUSTOMER'] as const;
const POLICY_KEYS = Object.keys(POLICIES) as PolicyKey[];

test('policy matrix matches the documented role capabilities exactly', () => {
  for (const role of ROLES) {
    for (const policy of POLICY_KEYS) {
      assert.equal(
        hasPolicyAccess(role, policy),
        EXPECTED_MATRIX[role][policy],
        `${role} × ${policy}`,
      );
    }
  }
});

test('capability list per role is exactly the documented set', () => {
  assert.deepEqual([...getRoleCapabilities('ADMIN')].sort(), [
    'admin:access',
    'orders:read:any',
    'orders:write',
    'session:authenticated',
    'users:manage',
  ]);
  assert.deepEqual([...getRoleCapabilities('CUSTOMER')].sort(), [
    'orders:read',
    'orders:write',
    'session:authenticated',
  ]);
});

test('unknown role has no capabilities at all', () => {
  assert.deepEqual(getRoleCapabilities('UNKNOWN' as never), []);
  assert.equal(hasPolicyAccess('UNKNOWN' as never, 'AUTHENTICATED_USER'), false);
});

function userDeps(role: 'ADMIN' | 'CUSTOMER' | null) {
  return {
    getCurrentUser: async () =>
      role === null
        ? null
        : {
            id: `u-${role}`,
            role,
            isActive: true,
            emailVerifiedAt: new Date(),
          },
  };
}

test('requirePolicy: anonymous is denied with UNAUTHENTICATED', async () => {
  await assert.rejects(
    rbacRequirePolicy({ headers: new Headers() } as never, 'ADMIN_ONLY', userDeps(null) as never),
    (error: unknown) =>
      error instanceof AuthError && error.code === 'UNAUTHENTICATED',
  );
});

test('requirePolicy: customer is denied ADMIN_ONLY with FORBIDDEN', async () => {
  await assert.rejects(
    rbacRequirePolicy({ headers: new Headers() } as never, 'ADMIN_ONLY', userDeps('CUSTOMER') as never),
    (error: unknown) => {
      if (!(error instanceof AuthError)) return false;
      assert.equal(error.code, 'FORBIDDEN');
      return true;
    },
  );
});

test('requirePolicy: admin passes ADMIN_ONLY', async () => {
  const result = await rbacRequirePolicy(
    { headers: new Headers() } as never,
    'ADMIN_ONLY',
    userDeps('ADMIN') as never,
  );
  assert.equal(result.user.id, 'u-ADMIN');
});

test('requirePolicy: both roles pass ORDERS_READ and ORDERS_WRITE', async () => {
  for (const role of ROLES) {
    const read = await rbacRequirePolicy(
      { headers: new Headers() } as never,
      'ORDERS_READ',
      userDeps(role) as never,
    );
    assert.equal(read.user.role, role);
    const write = await rbacRequirePolicy(
      { headers: new Headers() } as never,
      'ORDERS_WRITE',
      userDeps(role) as never,
    );
    assert.equal(write.user.role, role);
  }
});

test('requirePolicy: only admin passes ADMIN_MANAGE_USERS', async () => {
  const admin = await rbacRequirePolicy(
    { headers: new Headers() } as never,
    'ADMIN_MANAGE_USERS',
    userDeps('ADMIN') as never,
  );
  assert.equal(admin.user.role, 'ADMIN');

  await assert.rejects(
    rbacRequirePolicy({ headers: new Headers() } as never, 'ADMIN_MANAGE_USERS', userDeps('CUSTOMER') as never),
    (error: unknown) => error instanceof AuthError && error.code === 'FORBIDDEN',
  );
});

test('hasPolicyAccess mirrors the requirePolicy decision for every cell', async () => {
  // Cross-check the pure matrix against the runtime guard for all cells.
  for (const role of ROLES) {
    for (const policy of POLICY_KEYS) {
      const allowed = hasPolicyAccess(role, policy);
      if (allowed) {
        const result = await rbacRequirePolicy(
          { headers: new Headers() } as never,
          policy,
          userDeps(role) as never,
        );
        assert.equal(result.user.role, role);
      } else {
        await assert.rejects(
          rbacRequirePolicy({ headers: new Headers() } as never, policy, userDeps(role) as never),
          (error: unknown) => error instanceof AuthError && error.code === 'FORBIDDEN',
        );
      }
    }
  }
});

