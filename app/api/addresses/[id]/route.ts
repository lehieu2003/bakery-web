import { NextRequest, NextResponse } from 'next/server';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import {
  ADDRESS_TEXT_FIELDS,
  PHONE_PATTERN,
  addressError,
  addressesRouteDeps,
  validateTextField,
} from '../route';
import type {
  AddressRecord,
  AddressRequestLike,
  AddressesRouteDeps,
  AddressesRouteResult,
} from '../route';
import type { UpdateAddressRequest } from '@/types/api.types';

// PUT /api/addresses/[id] - Update an address owned by the current user
export async function handleUpdateAddressRequest(
  request: AddressRequestLike,
  params: { id: string },
  deps: AddressesRouteDeps = addressesRouteDeps,
): Promise<AddressesRouteResult<{ address: AddressRecord }>> {
  try {
    const user = await deps.requireUser(request);
    const body = await request.json?.();

    if (!body || typeof body !== 'object') {
      return addressError(400, 'Invalid address payload');
    }

    const payload = body as UpdateAddressRequest & Record<string, unknown>;

    const existing = await deps.findOwnedAddress(user.id, params.id);
    if (!existing) {
      return addressError(404, 'Address not found');
    }

    // Partial update: only fields present in the payload are validated and
    // written; unknown extra fields are ignored.
    const updates: UpdateAddressRequest = {};
    for (const field of ADDRESS_TEXT_FIELDS) {
      if (payload[field] === undefined) continue;
      const value = validateTextField(payload[field]);
      if (value === null) {
        return addressError(400, `${field} must be 1-200 characters`);
      }
      updates[field] = value;
    }

    if (updates.phone !== undefined && !PHONE_PATTERN.test(updates.phone)) {
      return addressError(400, 'Invalid phone number');
    }

    if (
      payload.isDefault !== undefined &&
      typeof payload.isDefault !== 'boolean'
    ) {
      return addressError(400, 'isDefault must be a boolean');
    }
    if (typeof payload.isDefault === 'boolean') {
      updates.isDefault = payload.isDefault;
    }

    const address = await deps.updateAddress(user.id, updates, params.id);
    if (!address) {
      // The row disappeared between the ownership gate and the scoped write.
      return addressError(404, 'Address not found');
    }
    if (updates.isDefault === true) {
      await deps.unsetOtherDefaults(user.id, params.id);
    }

    return {
      status: 200,
      body: { success: true, data: { address } },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update address';
    const status = mapAuthErrorToStatus(message);
    if (status !== 500) {
      return addressError(status, message);
    }
    console.error('Update address error:', error);
    return addressError(500, 'Failed to update address');
  }
}

// DELETE /api/addresses/[id] - Delete an address owned by the current user
export async function handleDeleteAddressRequest(
  request: AddressRequestLike,
  params: { id: string },
  deps: AddressesRouteDeps = addressesRouteDeps,
): Promise<AddressesRouteResult<{ deleted: boolean }>> {
  try {
    const user = await deps.requireUser(request);

    const existing = await deps.findOwnedAddress(user.id, params.id);
    if (!existing) {
      return addressError(404, 'Address not found');
    }

    await deps.deleteAddress(user.id, params.id);

    return {
      status: 200,
      body: { success: true, data: { deleted: true } },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete address';
    const status = mapAuthErrorToStatus(message);
    if (status !== 500) {
      return addressError(status, message);
    }
    console.error('Delete address error:', error);
    return addressError(500, 'Failed to delete address');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await handleUpdateAddressRequest(request, { id });
  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await handleDeleteAddressRequest(request, { id });
  return NextResponse.json(result.body, { status: result.status });
}
