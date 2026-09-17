import client from "./client";
import type { ApiResponse } from "../types/api";
import type { CartSummary } from "../types/models";

export async function getCart(): Promise<CartSummary> {
  const { data } = await client.get<ApiResponse<CartSummary>>("/cart/");
  return data.data;
}

export async function addItem(
  productId: number,
  quantity: number,
): Promise<CartSummary> {
  const { data } = await client.post<ApiResponse<CartSummary>>(
    "/cart/items/",
    { product_id: productId, quantity },
  );
  return data.data;
}

export async function updateCartItem(
  itemId: number,
  quantity: number,
): Promise<CartSummary> {
  const { data } = await client.patch<ApiResponse<CartSummary>>(
    `/cart/items/${itemId}/`,
    { quantity },
  );
  return data.data;
}

export async function removeCartItem(itemId: number): Promise<CartSummary> {
  const { data } = await client.delete<ApiResponse<CartSummary>>(
    `/cart/items/${itemId}/`,
  );
  return data.data;
}

export async function clearCart(): Promise<void> {
  await client.post("/cart/clear/");
}

export async function mergeCart(): Promise<{ merged: number; skipped: number }> {
  const { data } = await client.post<ApiResponse<{ merged: number; skipped: number }>>(
    "/cart/merge/",
  );
  return data.data;
}
