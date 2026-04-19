import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  AdminActionAuditEntry,
  AdminAuditQueryParams,
} from '@/types/api.types';

type AdminAuditListResponse = {
  logs: AdminActionAuditEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const auditService = {
  getAll: async (params?: AdminAuditQueryParams) => {
    const response = await http.get<AdminAuditListResponse>(
      ENDPOINTS.ADMIN.AUDIT.LIST,
      {
        params: params as Record<string, string | number | boolean | undefined>,
      },
    );
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch audit logs');
    }
    return response.data;
  },
};

export default auditService;
