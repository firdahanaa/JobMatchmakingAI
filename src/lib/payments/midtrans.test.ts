import { describe, expect, it } from "vitest";
import { computeMidtransSignature, verifyMidtransSignature } from "./midtrans";

describe("Midtrans webhook signature", () => {
  const signature =
    "4a7bb0f2bf12bf2c6efb82c0e86501e7a051d7fd799bab43c5f9efaaa87e00c1888324f477ec7037951d50873919bf949cb14a9259f89e0fafc6d5219eb23c73";

  it("computes the documented SHA512 concatenation", () => {
    expect(computeMidtransSignature("order-123", "200", "10000.00", "server-secret")).toBe(
      signature
    );
  });

  it("accepts the matching signature and rejects tampered or malformed signatures", () => {
    expect(
      verifyMidtransSignature("order-123", "200", "10000.00", "server-secret", signature)
    ).toBe(true);
    expect(
      verifyMidtransSignature("order-123", "201", "10000.00", "server-secret", signature)
    ).toBe(false);
    expect(verifyMidtransSignature("order-123", "200", "10000.00", "server-secret", "bad")).toBe(
      false
    );
  });
});