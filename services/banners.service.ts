/**
 * Public Banners Service
 * Fetch active banners for display
 */

import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { Banner } from '@/types/api.types';

export const bannersService = {
  /**
   * Get all active banners
   */
  getAll: async () => {
    const response = await http.get<Banner[]>(ENDPOINTS.PUBLIC.BANNERS, {
      showErrorToast: false,
    });
    return response.data || [];
  },
};

export default bannersService;
