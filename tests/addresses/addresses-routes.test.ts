import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleListAddressesRequest,
  handleCreateAddressRequest,
} from '@/app/api/addresses/route';
import {
  handleUpdateAddressRequest,
  handleDeleteAddressRequest,
} from '@/app/api/addresses/[id]/route';
import type { AddressesRouteDeps } from '@/app/api/addresses/route';

const ADDRESS = {
  fullName: 'Lan Nguyen', phone: '0909123456', province: 'TP.HCM',
  district: 'Quan 1', ward: 'P. Ben Nghe', street: '12 Nguyen Trai',
  isDefault: true,
};

function createDeps(overrides: Partial<AddressesRouteDeps> = {}): AddressesRouteDeps {
  return {
    requireUser: async () => ({ id: 'u1' }),
    listAddresses: async () => [],
    createAddress: async (input) => ({ id: 'a1', userId: 'u1', ...input, createdAt: new Date() }),
    countAddresses: async () => 0, // 0 = first address
    findOwnedAddress: async (_userId, id) => (id === 'a1' ? { id: 'a1', userId: 'u1', ...ADDRESS, isDefault: false, createdAt: new Date() } : null),
    updateAddress: async (id, input) => ({ id, userId: 'u1', ...ADDRESS, ...input, createdAt: new Date() }),
    unsetOtherDefaults: async () => {},
    deleteAddress: async () => {},
    ...overrides,
  };
}

test('address endpoints require a session', async () => {
  const noAuth = createDeps({ requireUser: async () => { throw new Error('unauthorized'); } });
  assert.equal((await handleListAddressesRequest({}, noAuth)).status, 401);
  assert.equal((await handleCreateAddressRequest({ json: async () => ADDRESS }, noAuth)).status, 401);
});

test('POST rejects missing required fields', async () => {
  const { fullName, ...incomplete } = ADDRESS;
  const result = await handleCreateAddressRequest({ json: async () => incomplete }, createDeps());
  assert.equal(result.status, 400);
});

test('first address is forced to default', async () => {
  let defaultOnCreate = false;
  await handleCreateAddressRequest(
    { json: async () => ({ ...ADDRESS, isDefault: false }) },
    createDeps({ createAddress: async (input) => { defaultOnCreate = input.isDefault; return { id: 'a1', userId: 'u1', ...input, createdAt: new Date() }; } }),
  );
  assert.equal(defaultOnCreate, true);
});

test('creating a default address unsets the previous default', async () => {
  let unsetCalled = false;
  await handleCreateAddressRequest(
    { json: async () => ({ ...ADDRESS, isDefault: true }) },
    createDeps({ countAddresses: async () => 3, unsetOtherDefaults: async () => { unsetCalled = true; } }),
  );
  assert.equal(unsetCalled, true);
});

test('PUT/DELETE of another user\'s address return 404', async () => {
  const deps = createDeps({ findOwnedAddress: async () => null });
  assert.equal((await handleUpdateAddressRequest({ json: async () => ({ phone: '0912345678' }) }, { id: 'other' }, deps)).status, 404);
  assert.equal((await handleDeleteAddressRequest({}, { id: 'other' }, deps)).status, 404);
});

test('PUT with isDefault unsets other defaults', async () => {
  let unsetCalled = false;
  const result = await handleUpdateAddressRequest(
    { json: async () => ({ isDefault: true }) }, { id: 'a1' },
    createDeps({ unsetOtherDefaults: async () => { unsetCalled = true; } }),
  );
  assert.equal(result.status, 200);
  assert.equal(unsetCalled, true);
});
