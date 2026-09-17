import client from "./client";
import type { ApiListResponse, ApiResponse, Pagination } from "../types/api";
import type { OrderDetail, OrderSummary } from "../types/models";

interface OrderListParams {
  page?: number;
  status?: string;
}

interface PlaceOrderData {
  address_id: number;
  coupon_code?: string;
  notes?: string;
  items?: { product_id: number; quantity: number }[];
}

export async function getOrders(
  params?: OrderListParams,
): Promise<{ orders: OrderSummary[]; pagination: Pagination }> {
  const { data } = await client.get<ApiListResponse<OrderSummary>>(
    "/orders/",
    { params },
  );
  return {
    orders: data.data,
    pagination: data.pagination!,
  };
}

export async function getOrder(id: number): Promise<OrderDetail> {
  const { data } = await client.get<ApiResponse<OrderDetail>>(
    `/orders/${id}/`,
  );
  return data.data;
}

export async function placeOrder(body: PlaceOrderData): Promise<OrderDetail> {
  const { data } = await client.post<ApiResponse<OrderDetail>>(
    "/orders/",
    body,
  );
  return data.data;
}

export async function cancelOrder(id: number): Promise<void> {
  await client.post(`/orders/${id}/cancel/`);
}
