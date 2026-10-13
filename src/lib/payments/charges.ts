import "server-only";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider, getPaymentProviderName } from "./index";

export interface CreateApplicationChargeInput {
  applicationId: string;
  amount: number;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  description: string;
}

export type CreateApplicationChargeResult =
  | { success: true; paymentUrl: string }
  | { success: false; error: string };

export async function createApplicationCharge(
  input: CreateApplicationChargeInput
): Promise<CreateApplicationChargeResult> {
  const supabase = await createClient();
  const candidateOrderId = randomUUID();
  const { data, error } = await supabase.rpc("prepare_application_payment", {
    p_application_id: input.applicationId,
    p_order_id: candidateOrderId,
    p_amount: input.amount,
    p_provider: getPaymentProviderName(),
  });

  if (error || !data) {
    console.error("Failed to prepare application payment:", error);
    return { success: false, error: "Gagal menyiapkan tagihan pembayaran." };
  }

  const prepared = Array.isArray(data) ? data[0] : data;
  if (!prepared?.order_id) {
    return { success: false, error: "Order ID pembayaran tidak tersedia." };
  }
  if (prepared.redirect_url) {
    return { success: true, paymentUrl: prepared.redirect_url };
  }

  const orderId = String(prepared.order_id);
  let charge: { providerRef: string; redirectUrl: string };
  try {
    charge = await getPaymentProvider().createCharge({
      orderId,
      amount: input.amount,
      customer: input.customer,
      description: input.description,
    });
  } catch (chargeError) {
    console.error("Payment provider failed to create charge:", chargeError);
    await supabase.rpc("save_application_payment_charge", {
      p_application_id: input.applicationId,
      p_order_id: orderId,
      p_provider_ref: null,
      p_redirect_url: null,
    });
    return { success: false, error: "Gateway gagal membuat tagihan. Kamu dapat mencoba lagi." };
  }

  const { error: saveError } = await supabase.rpc("save_application_payment_charge", {
    p_application_id: input.applicationId,
    p_order_id: orderId,
    p_provider_ref: charge.providerRef,
    p_redirect_url: charge.redirectUrl,
  });

  if (saveError) {
    console.error("Failed to save payment charge:", saveError);
    return { success: false, error: "Tagihan dibuat, tetapi tautan pembayaran gagal disimpan." };
  }

  return { success: true, paymentUrl: charge.redirectUrl };
}
