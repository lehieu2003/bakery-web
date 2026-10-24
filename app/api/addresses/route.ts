import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus, requireUserFromRequest } from '@/lib/rbac';
import type {
  Address,
  CreateAddressRequest,
  UpdateAddressRequest,
} from '@/types/api.types';

export type AddressRequestLike = {
  json?: () => Promise<unknown>;
  headers?: Pick<Headers, 'get'>;
};

export type AddressRecord = Omit<Address, 'createdAt'> & {
  createdAt: Date | string;
};

// Error responses carry no data; `data: never` keeps `data` readable (and
// required) on the union so callers can access it without narrowing.
export type AddressesRouteResult<TData> = {
  status: number;
  body:
    | { success: true; data: TData }
    | { success: false; error: string; data: never };
};

export function addressError(
  status: number,
  error: string,
): AddressesRouteResult<never> {
  return { status, body: { success: false, error, data: undefined as never } };
}

export type AddressesRouteDeps = {
  requireUser: (request: AddressRequestLike) => Promise<{ id: string }>;
  listAddresses: (userId: string) => Promise<AddressRecord[]>;
  createAddress: (
    input: CreateAddressRequest & { isDefault: boolean },
    userId: string,
  ) => Promise<AddressRecord>;
  countAddresses: (userId: string) => Promise<number>;
  findOwnedAddress: (
    userId: string,
    addressId: string,
  ) => Promise<AddressRecord | null>;
  // Returns null when no row matched (unknown id, not owned, or deleted
  // between the ownership gate and this write) so callers can respond 404.
  updateAddress: (
    userId: string,
    input: UpdateAddressRequest,
    addressId: string,
  ) => Promise<AddressRecord | null>;
  unsetOtherDefaults: (userId: string, excludeId: string) => Promise<unknown>;
  deleteAddress: (userId: string, addressId: string) => Promise<unknown>;
};

export const addressesRouteDeps: AddressesRouteDeps = {
  requireUser: (request) => requireUserFromRequest(request as NextRequest),
  listAddresses: (userId) =>
    prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    }),
  createAddress: (input, userId) =>
    prisma.address.create({ data: { ...input, userId } }),
  countAddresses: (userId) => prisma.address.count({ where: { userId } }),
  findOwnedAddress: (userId, addressId) =>
    prisma.address.findFirst({ where: { id: addressId, userId } }),
  updateAddress: async (userId, input, addressId) => {
    const result = await prisma.address.updateMany({
      where: { id: addressId, userId },
      data: input,
    });
    if (result.count === 0) return null;
    return prisma.address.findFirst({ where: { id: addressId, userId } });
  },
  unsetOtherDefaults: (userId, excludeId) =>
    prisma.address.updateMany({
      where: { userId, isDefault: true, id: { not: excludeId } },
      data: { isDefault: false },
    }),
  deleteAddress: (userId, addressId) =>
    prisma.address.deleteMany({ where: { id: addressId, userId } }),
};

export const ADDRESS_TEXT_FIELDS = [
  'fullName',
  'phone',
  'province',
  'district',
  'ward',
  'street',
] as const;

type AddressTextField = (typeof ADDRESS_TEXT_FIELDS)[number];

const MAX_ADDRESS_FIELD_LENGTH = 200;
export const PHONE_PATTERN = /^[0-9+\s.\-]{8,15}$/;

// Returns the trimmed value, or null when the field is missing, not a string,
// empty after trimming, or longer than the allowed length.
export function validateTextField(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_ADDRESS_FIELD_LENGTH) {
    return null;
  }
  return trimmed;
}

// GET /api/addresses - List the current user's addresses (default first)
export async function handleListAddressesRequest(
  request: AddressRequestLike,
  deps: AddressesRouteDeps = addressesRouteDeps,
): Promise<AddressesRouteResult<{ addresses: AddressRecord[] }>> {
  try {
    const user = await deps.requireUser(request);
    const addresses = await deps.listAddresses(user.id);

    return {
      status: 200,
      body: { success: true, data: { addresses } },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Không tải được addresses';
    const status = mapAuthErrorToStatus(message);
    if (status !== 500) {
      return addressError(status, message);
    }
    console.error('List addresses error:', error);
    return addressError(500, 'Không tải được addresses');
  }
}

// POST /api/addresses - Create an address for the current user
export async function handleCreateAddressRequest(
  request: AddressRequestLike,
  deps: AddressesRouteDeps = addressesRouteDeps,
): Promise<AddressesRouteResult<{ address: AddressRecord }>> {
  try {
    const user = await deps.requireUser(request);
    const body = await request.json?.();

    if (!body || typeof body !== 'object') {
      return addressError(400, 'Invalid address payload');
    }

    const payload = body as CreateAddressRequest & Record<string, unknown>;

    const fields = {} as Record<AddressTextField, string>;
    for (const field of ADDRESS_TEXT_FIELDS) {
      const value = validateTextField(payload[field]);
      if (value === null) {
        return addressError(400, `${field} is required (1-200 characters)`);
      }
      fields[field] = value;
    }

    if (!PHONE_PATTERN.test(fields.phone)) {
      return addressError(400, 'Số điện thoại không hợp lệ');
    }

    if (
      payload.isDefault !== undefined &&
      typeof payload.isDefault !== 'boolean'
    ) {
      return addressError(400, 'isDefault must be a boolean');
    }

    // A user's first address is always their default one.
    const isFirstAddress = (await deps.countAddresses(user.id)) === 0;
    const isDefault = payload.isDefault === true || isFirstAddress;

    const address = await deps.createAddress({ ...fields, isDefault }, user.id);
    if (isDefault) {
      await deps.unsetOtherDefaults(user.id, address.id);
    }

    return {
      status: 200,
      body: { success: true, data: { address } },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create address';
    const status = mapAuthErrorToStatus(message);
    if (status !== 500) {
      return addressError(status, message);
    }
    console.error('Create address error:', error);
    return addressError(500, 'Failed to create address');
  }
}

export async function GET(request: NextRequest) {
  const result = await handleListAddressesRequest(request);
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: NextRequest) {
  const result = await handleCreateAddressRequest(request);
  return NextResponse.json(result.body, { status: result.status });
}
