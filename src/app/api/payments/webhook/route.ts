import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments";
import { canTransition, canTransitionPayment } from "@/lib/workflow/transitions";
import { createChatSystemMessage } from "@/lib/chat/system-messages";
import type { ApplicationStatus, PaymentStatus } from "@/types/database";
import { decidePaymentWebhook } from "@/lib/payments/webhook";
import type { PaymentRecordStatus } from "@/types/database";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let webhook: Awaited<ReturnType<ReturnType<typeof getPaymentProvider>["verifyWebhook"]>>;
  try {
    webhook = await getPaymentProvider().verifyWebhook(request);
  } catch {
    return Response.json({ ok: false, error: "Webhook tidak valid." }, { status: 401 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ ok: false, error: "Konfigurasi webhook server belum lengkap." }, { status: 500 });
  }
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("id, application_id, amount, status, provider_ref")
    .eq("provider_order_id", webhook.orderId)
    .maybeSingle();

  if (paymentError) {
    return Response.json({ ok: false, error: "Gagal memeriksa catatan pembayaran." }, { status: 500 });
  }
  if (!payment) {
    return Response.json({ ok: false, error: "Pembayaran tidak ditemukan." }, { status: 404 });
  }

  const { data: application, error: applicationError } = await admin
    .from("applications")
    .select("id, project_id, status, payment_status")
    .eq("id", payment.application_id)
    .maybeSingle();

  if (applicationError || !application) {
    return Response.json({ ok: false, error: "Lamaran pembayaran tidak ditemukan." }, { status: 404 });
  }

  const decision = decidePaymentWebhook(
    {
      paymentRecordStatus: payment.status as PaymentRecordStatus,
      paymentStatus: application.payment_status as PaymentStatus,
      applicationStatus: application.status as ApplicationStatus,
      storedAmount: Number(payment.amount),
    },
    {
      status: webhook.status,
      amount: Number(webhook.raw["gross_amount"]),
    }
  );

  if (decision.kind === "reject") {
    const isAmountMismatch = decision.reason === "amount_mismatch";
    return Response.json(
      { ok: false, error: isAmountMismatch ? "Nominal pembayaran tidak cocok." : "Transisi pembayaran tidak valid." },
      { status: isAmountMismatch ? 400 : 409 }
    );
  }

  if (decision.kind === "duplicate") {
    return Response.json({ ok: true, alreadyProcessed: true });
  }

  if (decision.kind === "update-payment") {
    const { error } = await admin
      .from("payments")
      .update({ status: decision.status, raw_payload: webhook.raw })
      .eq("id", payment.id)
      .eq("status", "pending");

    if (error) {
      return Response.json({ ok: false, error: "Gagal memperbarui status pembayaran." }, { status: 500 });
    }
    return Response.json({ ok: true });
  }

  const currentPaymentStatus = application.payment_status as PaymentStatus;
  const currentApplicationStatus = application.status as ApplicationStatus;
  if (
    !canTransitionPayment(currentPaymentStatus, "paid", "system") ||
    !canTransition(currentApplicationStatus, "completed", "system", {
      hasFee: true,
      paymentStatus: "paid",
    })
  ) {
    return Response.json({ ok: false, error: "Transisi pembayaran tidak valid." }, { status: 409 });
  }

  const { error: completionError } = await admin.rpc("complete_application_payment", {
    p_payment_id: payment.id,
    p_provider_ref: String(webhook.raw["transaction_id"] ?? payment.provider_ref ?? ""),
    p_raw_payload: webhook.raw,
  });

  if (completionError) {
    return Response.json({ ok: false, error: "Gagal menyelesaikan pembayaran dan proyek." }, { status: 409 });
  }

  // Buat pesan sistem otomatis untuk pembayaran sukses dan proyek selesai
  await createChatSystemMessage(application.id, "payment_paid");
  await createChatSystemMessage(application.id, "application_completed");

  revalidatePath("/vendor/dashboard");
  revalidatePath(`/vendor/projects/${application.project_id}/applicants`);
  revalidatePath("/talent/applications");
  revalidatePath("/talent/dashboard");

  return Response.json({ ok: true });
}