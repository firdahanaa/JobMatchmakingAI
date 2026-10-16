import { describe, expect, it } from "vitest";
import { decidePaymentWebhook } from "./webhook";

const awaitingPayment = {
  paymentRecordStatus: "pending" as const,
  paymentStatus: "awaiting_payment" as const,
  applicationStatus: "approved" as const,
  storedAmount: 250_000,
};

describe("decidePaymentWebhook", () => {
  it("accepts a correctly settled payment for completion", () => {
    expect(decidePaymentWebhook(awaitingPayment, { status: "settlement", amount: 250_000 })).toEqual({
      kind: "complete",
    });
  });

  it("does not process a duplicate successful webhook twice", () => {
    expect(
      decidePaymentWebhook(
        {
          ...awaitingPayment,
          paymentRecordStatus: "paid",
          paymentStatus: "paid",
          applicationStatus: "completed",
        },
        { status: "settlement", amount: 250_000 }
      )
    ).toEqual({ kind: "duplicate" });
  });

  it("records an expired attempt without transitioning application payment status", () => {
    expect(decidePaymentWebhook(awaitingPayment, { status: "expire", amount: 250_000 })).toEqual({
      kind: "update-payment",
      status: "expired",
    });
  });

  it("rejects a webhook with an amount mismatch or an invalid workflow state", () => {
    expect(decidePaymentWebhook(awaitingPayment, { status: "settlement", amount: 250_001 })).toEqual({
      kind: "reject",
      reason: "amount_mismatch",
    });
    expect(
      decidePaymentWebhook(
        { ...awaitingPayment, applicationStatus: "submitted" },
        { status: "settlement", amount: 250_000 }
      )
    ).toEqual({ kind: "reject", reason: "invalid_state" });
  });
});