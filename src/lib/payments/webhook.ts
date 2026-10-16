import type {
  ApplicationStatus,
  PaymentRecordStatus,
  PaymentStatus,
} from "@/types/database";
import type { WebhookPaymentStatus } from "./types";

export interface PaymentWebhookSnapshot {
  paymentRecordStatus: PaymentRecordStatus;
  paymentStatus: PaymentStatus;
  applicationStatus: ApplicationStatus;
  storedAmount: number;
}

export interface PaymentWebhookEvent {
  status: WebhookPaymentStatus;
  amount: number;
}

export type PaymentWebhookDecision =
  | { kind: "complete" }
  | { kind: "duplicate" }
  | { kind: "update-payment"; status: PaymentRecordStatus }
  | { kind: "reject"; reason: "amount_mismatch" | "invalid_state" };

function amountsMatch(storedAmount: number, receivedAmount: number): boolean {
  return (
    Number.isFinite(storedAmount) &&
    Number.isFinite(receivedAmount) &&
    Math.round(storedAmount * 100) === Math.round(receivedAmount * 100)
  );
}

export function decidePaymentWebhook(
  snapshot: PaymentWebhookSnapshot,
  event: PaymentWebhookEvent
): PaymentWebhookDecision {
  if (!amountsMatch(snapshot.storedAmount, event.amount)) {
    return { kind: "reject", reason: "amount_mismatch" };
  }

  if (
    snapshot.paymentRecordStatus === "paid" &&
    snapshot.paymentStatus === "paid" &&
    snapshot.applicationStatus === "completed"
  ) {
    return { kind: "duplicate" };
  }

  if (
    snapshot.applicationStatus !== "approved" ||
    snapshot.paymentStatus !== "awaiting_payment"
  ) {
    return { kind: "reject", reason: "invalid_state" };
  }

  if (event.status === "settlement" || event.status === "capture") {
    return snapshot.paymentRecordStatus === "pending"
      ? { kind: "complete" }
      : { kind: "reject", reason: "invalid_state" };
  }

  if (snapshot.paymentRecordStatus !== "pending") {
    return { kind: "duplicate" };
  }

  const status: PaymentRecordStatus =
    event.status === "expire"
      ? "expired"
      : event.status === "cancel"
        ? "cancelled"
        : event.status === "pending"
          ? "pending"
          : "failed";

  return { kind: "update-payment", status };
}