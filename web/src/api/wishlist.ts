import client from "./client";
import type { ApiListResponse, ApiResponse } from "../types/api";
import type { WishlistItem } from "../types/models";

export async function getWishlist(): Promise<WishlistItem[]> {
  const { data } = await client.get<ApiListResponse<WishlistItem>>(
    "/wishlist/",
  );
  return data.data;
}

export async function addWishlist(productId: number): Promise<void> {
  await client.post("/wishlist/items/", { product_id: productId });
}

export async function removeWishlist(productId: number): Promise<void> {
  await client.delete(`/wishlist/items/${productId}/`);
}

export async function moveToCart(
  productId: number,
): Promise<{ moved: boolean }> {
  const { data } = await client.post<ApiResponse<{ moved: boolean }>>(
    `/wishlist/items/${productId}/move-to-cart/`,
  );
  return data.data;
}
