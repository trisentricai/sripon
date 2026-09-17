import client from "./client";
import type { ApiResponse } from "../types/api";
import type { PaymentInitiation } from "../types/models";

export async function initiatePayment(
  orderNumber: string,
): Promise<PaymentInitiation> {
  const { data } = await client.post<ApiResponse<PaymentInitiation>>(
    `/payments/initiate/${orderNumber}/`,
  );
  return data.data;
}

export async function getPaymentStatus(
  paymentId: string,
): Promise<PaymentInitiation> {
  const { data } = await client.get<ApiResponse<PaymentInitiation>>(
    `/payments/${paymentId}/`,
  );
  return data.data;
}

export async function mockConfirm(
  paymentId: string,
): Promise<PaymentInitiation> {
  const { data } = await client.post<ApiResponse<PaymentInitiation>>(
    "/payments/mock/success/",
    { payment_id: paymentId },
  );
  return data.data;
}
