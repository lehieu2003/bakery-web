'use client';

import { useQuery } from '@tanstack/react-query';

import { auditService } from '@/services/admin';
import type { AdminAuditQueryParams } from '@/types/api.types';

export const adminAuditKeys = {
  all: ['admin', 'audit'] as const,
  lists: () => [...adminAuditKeys.all, 'list'] as const,
  list: (params?: AdminAuditQueryParams) =>
    [...adminAuditKeys.lists(), params] as const,
};

export function useAdminAuditLogs(params?: AdminAuditQueryParams) {
  return useQuery({
    queryKey: adminAuditKeys.list(params),
    queryFn: () => auditService.getAll(params),
  });
}
