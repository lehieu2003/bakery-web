import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  ProductAttribute,
  CreateProductAttributeRequest,
  UpdateProductAttributeRequest,
} from '@/types/api.types';

export const productAttributesService = {
  getAll: async () => {
    const response = await http.get<{ attributes: ProductAttribute[] }>(
      ENDPOINTS.ADMIN.PRODUCT_ATTRIBUTES.LIST,
    );
    return response.data!.attributes;
  },

  getById: async (id: string) => {
    const response = await http.get<{ attribute: ProductAttribute }>(
      ENDPOINTS.ADMIN.PRODUCT_ATTRIBUTES.DETAIL(id),
    );
    return response.data!.attribute;
  },

  create: async (data: CreateProductAttributeRequest) => {
    const response = await http.post<{ attribute: ProductAttribute }>(
      ENDPOINTS.ADMIN.PRODUCT_ATTRIBUTES.CREATE,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Tạo bộ lọc sản phẩm thành công!',
      },
    );
    return response.data!.attribute;
  },

  update: async (id: string, data: UpdateProductAttributeRequest) => {
    const response = await http.put<{ attribute: ProductAttribute }>(
      ENDPOINTS.ADMIN.PRODUCT_ATTRIBUTES.UPDATE(id),
      data,
      {
        showSuccessToast: true,
        successMessage: 'Cập nhật bộ lọc sản phẩm thành công!',
      },
    );
    return response.data!.attribute;
  },

  delete: async (id: string) => {
    const response = await http.delete<{ message: string }>(
      ENDPOINTS.ADMIN.PRODUCT_ATTRIBUTES.DELETE(id),
      {
        showSuccessToast: true,
        successMessage: 'Xóa bộ lọc sản phẩm thành công!',
      },
    );
    return response.data!;
  },
};

export default productAttributesService;
