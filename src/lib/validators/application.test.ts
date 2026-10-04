import { describe, it, expect } from "vitest";
import {
  applyApplicationSchema,
  updateApplicationStatusSchema,
  uuidSchema,
} from "./application";

describe("Application Validators", () => {
  it("menerima pesan kosong atau di bawah 500 karakter", () => {
    expect(applyApplicationSchema.safeParse({}).success).toBe(true);
    expect(applyApplicationSchema.safeParse({ message: "" }).success).toBe(true);
    expect(
      applyApplicationSchema.safeParse({
        message: "Saya sangat tertarik dengan proyek ini dan siap berkontribusi.",
      }).success
    ).toBe(true);
  });

  it("menolak pesan yang melebihi 500 karakter", () => {
    const longMessage = "a".repeat(501);
    const result = applyApplicationSchema.safeParse({ message: longMessage });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("maksimal 500 karakter");
    }
  });

  it("memvalidasi update status lamaran hanya untuk accepted, rejected, completed", () => {
    expect(updateApplicationStatusSchema.safeParse({ status: "accepted" }).success).toBe(true);
    expect(updateApplicationStatusSchema.safeParse({ status: "rejected" }).success).toBe(true);
    expect(updateApplicationStatusSchema.safeParse({ status: "completed" }).success).toBe(true);

    expect(updateApplicationStatusSchema.safeParse({ status: "pending" }).success).toBe(false);
    expect(updateApplicationStatusSchema.safeParse({ status: "invalid_status" }).success).toBe(false);
  });

  it("memvalidasi format UUID dengan benar", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const invalidUuid = "not-a-uuid-12345";
    expect(uuidSchema.safeParse(validUuid).success).toBe(true);
    expect(uuidSchema.safeParse(invalidUuid).success).toBe(false);
  });
});
