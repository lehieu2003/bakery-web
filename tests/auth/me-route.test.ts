import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleGetCurrentUserRequest,
  handleUpdateProfileRequest,
} from '@/app/api/auth/me/route';

const authUser = {
  id: 'u1',
  email: 'user@example.com',
  name: 'User One',
  phone: '0900000000',
  role: 'CUSTOMER' as const,
  memberLevel: 'GOLD' as const,
  points: 120,
  emailVerifiedAt: null,
  isActive: true,
};

test('GET /api/auth/me handler returns 401 for unauthenticated user', async () => {
  const result = await handleGetCurrentUserRequest({
    getCurrentUser: async () => null,
    updateUserProfile: async () => authUser,
  });

  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
});

test('GET /api/auth/me handler returns user data for authenticated user', async () => {
  const result = await handleGetCurrentUserRequest({
    getCurrentUser: async () => authUser,
    updateUserProfile: async () => authUser,
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.user.email, 'user@example.com');
  assert.equal(result.body.data?.user.memberLevel, 'GOLD');
  assert.equal(result.body.data?.user.points, 120);
});

test('PATCH /api/auth/me handler returns 401 for unauthenticated user', async () => {
  const result = await handleUpdateProfileRequest(
    { name: 'Updated Name' },
    {
      getCurrentUser: async () => null,
      updateUserProfile: async () => authUser,
    },
  );

  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
});

test('PATCH /api/auth/me handler validates name length', async () => {
  const result = await handleUpdateProfileRequest(
    { name: 'A' },
    {
      getCurrentUser: async () => authUser,
      updateUserProfile: async () => authUser,
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Tên phải từ 2 đến 100 ký tự');
});

test('PATCH /api/auth/me handler validates phone format', async () => {
  const result = await handleUpdateProfileRequest(
    { phone: 'abc###' },
    {
      getCurrentUser: async () => authUser,
      updateUserProfile: async () => authUser,
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Số điện thoại không hợp lệ');
});

test('PATCH /api/auth/me handler returns 400 for non-object payload', async () => {
  const result = await handleUpdateProfileRequest('invalid' as never, {
    getCurrentUser: async () => authUser,
    updateUserProfile: async () => authUser,
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Payload không hợp lệ');
});

test('PATCH /api/auth/me handler updates only allowed profile fields', async () => {
  let updatePayload:
    | { userId: string; data: { name?: string | null; phone?: string | null } }
    | null = null;

  const result = await handleUpdateProfileRequest(
    {
      name: '  New Name  ',
      phone: '0912345678',
      memberLevel: 'PLATINUM',
      points: 9999,
    } as unknown as Record<string, unknown>,
    {
      getCurrentUser: async () => authUser,
      updateUserProfile: async (payload) => {
        updatePayload = payload;
        return {
          ...authUser,
          name: payload.data.name ?? authUser.name,
          phone: payload.data.phone ?? authUser.phone,
        };
      },
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(updatePayload, {
    userId: 'u1',
    data: { name: 'New Name', phone: '0912345678' },
  });
  assert.equal(result.body.data?.user.memberLevel, 'GOLD');
  assert.equal(result.body.data?.user.points, 120);
});
