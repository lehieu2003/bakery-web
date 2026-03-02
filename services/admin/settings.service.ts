/**
 * Admin Settings Service
 * Store configuration management
 */

import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { StoreSettings, UpdateSettingsRequest } from '@/types/api.types';

export const settingsService = {
  /**
   * Get store settings
   */
  get: async () => {
    const response = await http.get<StoreSettings>(ENDPOINTS.ADMIN.SETTINGS);
    return response.data!;
  },

  /**
   * Update store settings
   */
  update: async (data: UpdateSettingsRequest) => {
    const response = await http.put<StoreSettings>(
      ENDPOINTS.ADMIN.SETTINGS,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Cập nhật cấu hình thành công!',
      },
    );
    return response.data!;
  },
};

export default settingsService;
