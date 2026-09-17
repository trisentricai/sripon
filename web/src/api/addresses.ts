import client from "./client";
import type { ApiListResponse, ApiResponse } from "../types/api";
import type { Address } from "../types/models";

export async function getAddresses(): Promise<Address[]> {
  const { data } = await client.get<ApiListResponse<Address>>(
    "/auth/addresses/",
  );
  return data.data;
}

export async function createAddress(
  body: Omit<Address, "id" | "created_at" | "updated_at">,
): Promise<Address> {
  const { data } = await client.post<ApiResponse<Address>>(
    "/auth/addresses/",
    body,
  );
  return data.data;
}

export async function updateAddress(
  id: number,
  body: Partial<Address>,
): Promise<Address> {
  const { data } = await client.patch<ApiResponse<Address>>(
    `/auth/addresses/${id}/`,
    body,
  );
  return data.data;
}

export async function deleteAddress(id: number): Promise<void> {
  await client.delete(`/auth/addresses/${id}/`);
}
