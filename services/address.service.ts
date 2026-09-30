import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type {
  Address,
  CreateAddressRequest,
  UpdateAddressRequest,
} from '@/types/api.types';

interface AddressesListResponse {
  addresses: Address[];
}

interface AddressResponse {
  address: Address;
}

interface DeleteAddressResponse {
  deleted: boolean;
}

export const addressService = {
  getMyAddresses: async () => {
    const response = await http.get<AddressesListResponse>(
      ENDPOINTS.ADDRESSES.LIST,
      {
        showErrorToast: false,
        skipAuthRedirect: true,
      },
    );
    return response.data!.addresses;
  },

  createAddress: async (input: CreateAddressRequest) => {
    const response = await http.post<AddressResponse>(
      ENDPOINTS.ADDRESSES.LIST,
      input,
      {
        showErrorToast: false,
        skipAuthRedirect: true,
      },
    );
    return response.data!.address;
  },

  updateAddress: async (id: string, input: UpdateAddressRequest) => {
    const response = await http.put<AddressResponse>(
      ENDPOINTS.ADDRESSES.DETAIL(id),
      input,
      {
        showErrorToast: false,
        skipAuthRedirect: true,
      },
    );
    return response.data!.address;
  },

  deleteAddress: async (id: string) => {
    const response = await http.delete<DeleteAddressResponse>(
      ENDPOINTS.ADDRESSES.DETAIL(id),
      {
        showErrorToast: false,
        skipAuthRedirect: true,
      },
    );
    return response.data!.deleted;
  },
};

export default addressService;
