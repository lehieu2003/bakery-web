/**
 * Admin Membership Service
 * Membership tier configuration management
 */

import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  MembershipConfig,
  UpdateMembershipRequest,
} from '@/types/api.types';

export const membershipService = {
  /**
   * Get membership configuration
   */
  get: async () => {
    const response = await http.get<MembershipConfig>(
      ENDPOINTS.ADMIN.MEMBERSHIP,
    );
    return response.data!;
  },

  /**
   * Update membership configuration
   */
  update: async (data: UpdateMembershipRequest) => {
    const response = await http.put<MembershipConfig>(
      ENDPOINTS.ADMIN.MEMBERSHIP,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Cập nhật cấu hình thành viên thành công!',
      },
    );
    return response.data!;
  },
};

export default membershipService;
