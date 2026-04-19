import type { UserRole } from '@prisma/client';
import {
  POLICIES,
  ROLE_CAPABILITIES,
  type Capability,
  type PolicyKey,
} from '@/lib/authorization-policy';

import { getCurrentUserFromRequest } from '@/lib/session';

export type { Capability, PolicyKey } from '@/lib/authorization-policy';

type RequestLike = {
  headers: Pick<Headers, 'get'>;
};

type AuthenticatedUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUserFromRequest>>
>;

type CurrentUserResolver = (
  request: RequestLike,
) => Promise<AuthenticatedUser | null>;

type RequireUserDeps = {
  getCurrentUser: CurrentUserResolver;
};

const defaultRequireUserDeps: RequireUserDeps = {
  getCurrentUser: getCurrentUserFromRequest as CurrentUserResolver,
};

export type AuthErrorCode =
  | 'UNAUTHENTICATED'
  | 'MISSING_TOKEN'
  | 'FORBIDDEN'
  | 'INVALID_TOKEN'
  | 'OWNERSHIP_REQUIRED'
  | 'TOKEN_NOT_CONFIGURED';

export type AuthErrorOptions = {
  details?: Record<string, unknown>;
  httpHint?: number;
  publicMessage?: string;
};

const DEFAULT_MESSAGE_BY_CODE: Record<AuthErrorCode, string> = {
  UNAUTHENTICATED: 'Unauthorized',
  MISSING_TOKEN: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  INVALID_TOKEN: 'Forbidden',
  OWNERSHIP_REQUIRED: 'Forbidden',
  TOKEN_NOT_CONFIGURED: 'Service unavailable',
};

const STATUS_BY_CODE: Record<AuthErrorCode, number> = {
  UNAUTHENTICATED: 401,
  MISSING_TOKEN: 401,
  FORBIDDEN: 403,
  INVALID_TOKEN: 403,
  OWNERSHIP_REQUIRED: 403,
  TOKEN_NOT_CONFIGURED: 503,
};

export class AuthError extends Error {
  public readonly code: AuthErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly httpHint?: number;

  constructor(code: AuthErrorCode, options: AuthErrorOptions = {}) {
    super(options.publicMessage ?? DEFAULT_MESSAGE_BY_CODE[code]);
    this.name = 'AuthError';
    this.code = code;
    this.details = options.details;
    this.httpHint = options.httpHint;
  }
}

export const RBAC_POLICY_KEYS: Record<PolicyKey, PolicyKey> = {
  ADMIN_ONLY: 'ADMIN_ONLY',
  AUTHENTICATED_USER: 'AUTHENTICATED_USER',
  ORDERS_READ: 'ORDERS_READ',
  ORDERS_WRITE: 'ORDERS_WRITE',
  ADMIN_MANAGE_USERS: 'ADMIN_MANAGE_USERS',
};

type RequirePolicyResult = {
  user: AuthenticatedUser;
  userCapabilities: readonly Capability[];
  requiredCapabilities: readonly Capability[];
};

type RbacDenyContext = {
  policyKey?: PolicyKey;
  requiredCapabilities?: readonly Capability[];
  userId?: string;
  userRole?: UserRole;
  resourceId?: string;
  requestId?: string | null;
  reason?: string;
};

function mapLegacyMessageToStatus(message: string) {
  const normalized = message.trim().toLowerCase();
  if (normalized === 'unauthorized') return 401;
  if (normalized.includes('token is not configured')) return 503;
  if (normalized.startsWith('forbidden')) return 403;
  return 500;
}

function getRequestId(request: RequestLike) {
  return (
    request.headers.get('x-request-id') ??
    request.headers.get('x-correlation-id') ??
    null
  );
}

function logRbacDeny(code: AuthErrorCode, context: RbacDenyContext) {
  console.warn('RBAC_DENY', {
    code,
    ...context,
  });
}

function getRoleCapabilities(role: UserRole): readonly Capability[] {
  return ROLE_CAPABILITIES[role] ?? [];
}

export function mapAuthErrorToStatus(error: unknown) {
  if (error instanceof AuthError) {
    if (Number.isInteger(error.httpHint) && error.httpHint && error.httpHint > 0) {
      return error.httpHint;
    }
    return STATUS_BY_CODE[error.code] ?? 500;
  }

  if (typeof error === 'string') {
    return mapLegacyMessageToStatus(error);
  }

  if (error instanceof Error) {
    return mapLegacyMessageToStatus(error.message);
  }

  return 500;
}

export async function requireUserFromRequest(
  request: RequestLike,
  deps: RequireUserDeps = defaultRequireUserDeps,
) {
  const user = await deps.getCurrentUser(request);
  if (!user) {
    logRbacDeny('UNAUTHENTICATED', {
      requestId: getRequestId(request),
      reason: 'missing_session',
    });
    throw new AuthError('UNAUTHENTICATED');
  }
  return user;
}

export async function requirePolicy(
  request: RequestLike,
  policyKey: PolicyKey,
  deps: RequireUserDeps = defaultRequireUserDeps,
): Promise<RequirePolicyResult> {
  const user = await requireUserFromRequest(request, deps);
  const userCapabilities = getRoleCapabilities(user.role);
  const requiredCapabilities = POLICIES[policyKey];
  const isAllowed = requiredCapabilities.some((capability) =>
    userCapabilities.includes(capability),
  );

  if (!isAllowed) {
    logRbacDeny('FORBIDDEN', {
      policyKey,
      requiredCapabilities,
      userId: user.id,
      userRole: user.role,
      requestId: getRequestId(request),
      reason: 'missing_required_capability',
    });
    throw new AuthError('FORBIDDEN', {
      details: {
        policyKey,
        requiredCapabilities,
        userRole: user.role,
      },
    });
  }

  return {
    user,
    userCapabilities,
    requiredCapabilities,
  };
}

export async function requirePolicyFromRequest(
  request: RequestLike,
  policyKey: PolicyKey,
  deps: RequireUserDeps = defaultRequireUserDeps,
) {
  const result = await requirePolicy(request, policyKey, deps);
  return result.user;
}

export function assertOwnership(
  userId: string,
  ownerId: string,
  overrideCapabilities: readonly Capability[],
  userCapabilities: readonly Capability[],
  context: Omit<RbacDenyContext, 'requiredCapabilities'> = {},
) {
  if (userId === ownerId) return;

  const hasOverride = overrideCapabilities.some((capability) =>
    userCapabilities.includes(capability),
  );

  if (hasOverride) return;

  logRbacDeny('OWNERSHIP_REQUIRED', {
    ...context,
    reason: 'owner_mismatch',
  });
  throw new AuthError('OWNERSHIP_REQUIRED', {
    details: {
      userId,
      ownerId,
      ...context,
    },
  });
}

type TokenOptions = {
  headerName?: string;
  allowBearer?: boolean;
};

export function resolveRequestToken(
  request: RequestLike,
  options: TokenOptions = {},
) {
  const { headerName = 'x-reconcile-token', allowBearer = true } = options;
  const headerToken = request.headers.get(headerName)?.trim();
  if (headerToken) return headerToken;

  if (!allowBearer) return null;
  const authHeader = request.headers.get('authorization')?.trim() ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const bearer = authHeader.slice(7).trim();
  return bearer || null;
}

export function requireRequestToken(
  request: RequestLike,
  expectedToken: string | null,
  options: TokenOptions = {},
) {
  if (!expectedToken) {
    logRbacDeny('TOKEN_NOT_CONFIGURED', {
      requestId: getRequestId(request),
      reason: 'expected_token_missing',
    });
    throw new AuthError('TOKEN_NOT_CONFIGURED');
  }

  const token = resolveRequestToken(request, options);
  if (!token) {
    logRbacDeny('MISSING_TOKEN', {
      requestId: getRequestId(request),
      reason: 'request_token_missing',
    });
    throw new AuthError('MISSING_TOKEN');
  }

  if (token !== expectedToken) {
    logRbacDeny('INVALID_TOKEN', {
      requestId: getRequestId(request),
      reason: 'token_mismatch',
    });
    throw new AuthError('INVALID_TOKEN');
  }
}
