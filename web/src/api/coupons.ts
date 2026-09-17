import client from "./client";
import type { ApiResponse } from "../types/api";
import type { CouponValidation } from "../types/models";

export async function validateCoupon(
  code: string,
  orderValue: string,
): Promise<CouponValidation> {
  const { data } = await client.post<ApiResponse<CouponValidation>>(
    "/coupons/validate/",
    { code, order_value: orderValue },
  );
  return data.data;
}
