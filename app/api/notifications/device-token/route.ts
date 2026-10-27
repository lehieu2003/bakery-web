import { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, toApiJson } from '@/lib/api-response';
import { mapAuthErrorToStatus, requireUserFromRequest } from '@/lib/rbac';

type RegisterDeviceTokenInput = {
  token: string;
  platform: string;
  deviceId: string | null;
  appVersion: string | null;
};

type DeviceTokenDeps = {
  getCurrentUser: (request: NextRequest) => Promise<{ id: string } | null>;
  upsertToken: (args: {
    userId: string;
    input: RegisterDeviceTokenInput;
  }) => Promise<{ id: string; isActive: boolean; updatedAt: Date }>;
  revokeToken: (args: {
    userId: string;
    token: string;
  }) => Promise<{ count: number }>;
};

/**
 * Push fan-out per user is capped (FCM multicast takes at most 500 tokens),
 * and rows are never deleted, so keep only the most recently registered
 * devices active.
 */
export const MAX_ACTIVE_DEVICE_TOKENS = 10;
const MAX_TOKEN_LENGTH = 4096;
const MAX_DEVICE_FIELD_LENGTH = 128;

export async function deactivateSurplusDeviceTokens(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  const surplus = await tx.deviceToken.findMany({
    where: { userId, isActive: true },
    orderBy: { lastRegistered: 'desc' },
    skip: MAX_ACTIVE_DEVICE_TOKENS,
    select: { id: true },
  });
  if (surplus.length === 0) return;

  await tx.deviceToken.updateMany({
    where: { id: { in: surplus.map((row) => row.id) } },
    data: { isActive: false, deactivatedAt: new Date() },
  });
}

class DeviceTokenOwnershipError extends Error {
  constructor() {
    super('Device token already belongs to another user');
    this.name = 'DeviceTokenOwnershipError';
  }
}

const defaultDeps: DeviceTokenDeps = {
  getCurrentUser: requireUserFromRequest,
  upsertToken: ({ userId, input }) =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.deviceToken.findFirst({
        where: { token: input.token },
        select: { id: true, userId: true },
      });

      if (existing && existing.userId !== userId) {
        throw new DeviceTokenOwnershipError();
      }

      const select = { id: true, isActive: true, updatedAt: true } as const;
      const saved = existing
        ? await tx.deviceToken.update({
            where: { id: existing.id },
            data: {
              platform: input.platform,
              deviceId: input.deviceId,
              appVersion: input.appVersion,
              isActive: true,
              deactivatedAt: null,
              lastRegistered: new Date(),
            },
            select,
          })
        : await tx.deviceToken.create({
            data: {
              userId,
              token: input.token,
              platform: input.platform,
              deviceId: input.deviceId,
              appVersion: input.appVersion,
              isActive: true,
            },
            select,
          });

      await deactivateSurplusDeviceTokens(tx, userId);
      return saved;
    }),
  revokeToken: ({ userId, token }) =>
    prisma.deviceToken.updateMany({
      where: {
        userId,
        token,
        isActive: true,
      },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
      },
    }),
};

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseRegisterInput(body: unknown): RegisterDeviceTokenInput | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;

  const row = body as Record<string, unknown>;
  const token = normalizeText(row.token);
  const platform = normalizeText(row.platform).toLowerCase();
  const deviceId = normalizeText(row.deviceId);
  const appVersion = normalizeText(row.appVersion);

  if (!token || !platform) return null;
  if (!['ios', 'android', 'web'].includes(platform)) return null;
  if (
    token.length > MAX_TOKEN_LENGTH ||
    deviceId.length > MAX_DEVICE_FIELD_LENGTH ||
    appVersion.length > MAX_DEVICE_FIELD_LENGTH
  ) {
    return null;
  }

  return {
    token,
    platform,
    deviceId: deviceId || null,
    appVersion: appVersion || null,
  };
}

function parseRevokeInput(body: unknown): { token: string } | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;

  const row = body as Record<string, unknown>;
  const token = normalizeText(row.token);
  if (!token) return null;

  return { token };
}

export async function handleRegisterDeviceTokenRequest(
  request: NextRequest,
  deps: DeviceTokenDeps = defaultDeps,
) {
  try {
    const user = await deps.getCurrentUser(request);
    if (!user) {
      return { status: 401, body: apiError('Unauthorized') };
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return { status: 400, body: apiError('Dữ liệu yêu cầu không hợp lệ') };
    }

    const payload = parseRegisterInput(body);
    if (!payload) {
      return { status: 400, body: apiError('Dữ liệu yêu cầu không hợp lệ') };
    }

    const saved = await deps.upsertToken({ userId: user.id, input: payload });
    return {
      status: 200,
      body: apiSuccess({
        id: saved.id,
        isActive: saved.isActive,
        token: payload.token,
        platform: payload.platform,
        updatedAt: saved.updatedAt,
      }),
    };
  } catch (error) {
    if (
      error instanceof DeviceTokenOwnershipError ||
      (error instanceof Error &&
        error.message === 'Device token already belongs to another user')
    ) {
      return {
        status: 409,
        body: apiError('Device token is already registered to another user'),
      };
    }

    const message =
      error instanceof Error ? error.message : 'Failed to register device token';
    const status = mapAuthErrorToStatus(message);
    if (status !== 500) {
      return {
        status,
        body: apiError(message),
      };
    }

    throw error;
  }
}

export async function handleRevokeDeviceTokenRequest(
  request: NextRequest,
  deps: DeviceTokenDeps = defaultDeps,
) {
  try {
    const user = await deps.getCurrentUser(request);
    if (!user) {
      return { status: 401, body: apiError('Unauthorized') };
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return { status: 400, body: apiError('Dữ liệu yêu cầu không hợp lệ') };
    }

    const payload = parseRevokeInput(body);
    if (!payload) {
      return { status: 400, body: apiError('Dữ liệu yêu cầu không hợp lệ') };
    }

    const result = await deps.revokeToken({ userId: user.id, token: payload.token });
    return {
      status: 200,
      body: apiSuccess({ count: result.count }),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to revoke device token';
    const status = mapAuthErrorToStatus(message);
    if (status !== 500) {
      return {
        status,
        body: apiError(message),
      };
    }

    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await handleRegisterDeviceTokenRequest(request, defaultDeps);
    return toApiJson(result.body, result.status);
  } catch (error) {
    console.error('Register device token error:', error);
    return toApiJson(apiError('Failed to register device token'), 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const result = await handleRevokeDeviceTokenRequest(request, defaultDeps);
    return toApiJson(result.body, result.status);
  } catch (error) {
    console.error('Revoke device token error:', error);
    return toApiJson(apiError('Failed to revoke device token'), 500);
  }
}
