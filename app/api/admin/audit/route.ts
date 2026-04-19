import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
type AdminUser = {
  id: string;
  role: UserRole;
};

type AuditLogRow = {
  id: string;
  settingKey: string;
  mutationType: string;
  actorUserId: string | null;
  actorRole: UserRole | null;
  metadata: unknown;
  createdAt: Date;
  actor: {
    id: string;
    name: string | null;
    role: UserRole;
  } | null;
};

type AuditListDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findAdminActionLogs: (args: {
    actorUserId?: string;
    mutationType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    skip?: number;
    take: number;
  }) => Promise<AuditLogRow[]>;
};

type AuditListResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const SCAN_BATCH_SIZE = 200;

const defaultDeps: AuditListDeps = {
  requireAdmin,
  findAdminActionLogs: ({ actorUserId, mutationType, dateFrom, dateTo, skip, take }) =>
    prisma.settingAuditLog.findMany({
      where: {
        settingKey: {
          startsWith: 'admin_action:',
        },
        ...(actorUserId ? { actorUserId } : {}),
        ...(mutationType ? { mutationType } : {}),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(skip ? { skip } : {}),
      take,
    }),
};

type ParsedQuery = {
  module: string | null;
  entity: string | null;
  actorUserId: string | null;
  mutationType: string | null;
  page: number;
  limit: number;
  dateFrom: Date | null;
  dateTo: Date | null;
};

type SafeCorrelation = {
  requestId: string | null;
  route: string | null;
  httpMethod: string | null;
  orderId: string | null;
  paymentId: string | null;
  transactionId: string | null;
  attempt: number | null;
};

type SafeAuditEntry = {
  id: string;
  module: string;
  entity: string;
  entityId: string;
  summary: string;
  mutationType: string;
  actorUserId: string | null;
  actorRole: UserRole | null;
  actor: {
    id: string;
    name: string | null;
    role: UserRole;
  } | null;
  correlation: SafeCorrelation;
  createdAt: string;
};


function normalizePage(value: string | null) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) || parsed < 1 ? DEFAULT_PAGE : parsed;
}

function normalizeLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function normalizeString(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDate(value: string | null, label: string) {
  if (!value) return { value: null as Date | null };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { error: `${label} must be a valid ISO date` } as const;
  }
  return { value: parsed };
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseQuery(requestUrl: string) {
  const { searchParams } = new URL(requestUrl);

  const fromResult = parseDate(searchParams.get('from'), 'from');
  if ('error' in fromResult) return { error: fromResult.error } as const;

  const toResult = parseDate(searchParams.get('to'), 'to');
  if ('error' in toResult) return { error: toResult.error } as const;

  return {
    value: {
      module: normalizeString(searchParams.get('module')),
      entity: normalizeString(searchParams.get('entity')),
      actorUserId: normalizeString(searchParams.get('actorUserId')),
      mutationType: normalizeString(searchParams.get('mutationType')),
      page: normalizePage(searchParams.get('page')),
      limit: normalizeLimit(searchParams.get('limit')),
      dateFrom: fromResult.value,
      dateTo: toResult.value,
    } satisfies ParsedQuery,
  } as const;
}

function toSafeAuditEntry(log: AuditLogRow): SafeAuditEntry | null {
  const metadata = asObject(log.metadata);
  if (!metadata) return null;
  if (metadata.source !== 'admin_action') return null;

  const correlation = asObject(metadata.correlation);

  return {
    id: log.id,
    module: asString(metadata.module) ?? 'unknown',
    entity: asString(metadata.entity) ?? 'unknown',
    entityId: asString(metadata.entityId) ?? 'unknown',
    summary: asString(metadata.summary) ?? '',
    mutationType: log.mutationType,
    actorUserId: log.actorUserId,
    actorRole: log.actorRole,
    actor: log.actor
      ? {
          id: log.actor.id,
          name: log.actor.name,
          role: log.actor.role,
        }
      : null,
    correlation: {
      requestId: asString(correlation?.requestId ?? null),
      route: asString(correlation?.route ?? null),
      httpMethod: asString(correlation?.httpMethod ?? null),
      orderId: asString(correlation?.orderId ?? null),
      paymentId: asString(correlation?.paymentId ?? null),
      transactionId: asString(correlation?.transactionId ?? null),
      attempt: asNumber(correlation?.attempt ?? null),
    },
    createdAt: log.createdAt.toISOString(),
  };
}

function applyLocalFilters(logs: SafeAuditEntry[], query: ParsedQuery) {
  return logs.filter((log) => {
    if (query.module && log.module !== query.module) return false;
    if (query.entity && log.entity !== query.entity) return false;
    return true;
  });
}

export async function handleAdminAuditListGetRequest(
  request: Pick<NextRequest, 'url'>,
  deps: AuditListDeps = defaultDeps,
): Promise<AuditListResult> {
  await deps.requireAdmin();

  const parsed = parseQuery(request.url);
  if ('error' in parsed) {
    return {
      status: 400,
      body: { success: false, error: parsed.error },
    };
  }
  const query = parsed.value;
  const start = (query.page - 1) * query.limit;
  const end = start + query.limit;
  let offset = 0;
  let total = 0;
  const logs: SafeAuditEntry[] = [];

  while (true) {
    const rawBatch = await deps.findAdminActionLogs({
      actorUserId: query.actorUserId ?? undefined,
      mutationType: query.mutationType ?? undefined,
      dateFrom: query.dateFrom ?? undefined,
      dateTo: query.dateTo ?? undefined,
      skip: offset,
      take: SCAN_BATCH_SIZE,
    });

    if (rawBatch.length === 0) break;

    const safeBatch = applyLocalFilters(
      rawBatch.map(toSafeAuditEntry).filter((log): log is SafeAuditEntry => !!log),
      query,
    );

    for (const log of safeBatch) {
      if (total >= start && total < end) logs.push(log);
      total += 1;
    }

    offset += rawBatch.length;
    if (rawBatch.length < SCAN_BATCH_SIZE) break;
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        logs,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      },
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const result = await handleAdminAuditListGetRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin audit list error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}


