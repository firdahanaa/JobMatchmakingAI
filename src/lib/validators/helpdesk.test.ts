import { describe, expect, it } from "vitest";
import { HELPDESK_CATEGORIES, helpdeskSchema } from "./helpdesk";

describe("helpdeskSchema", () => {
  it("accepts every category and a valid description", () => {
    for (const category of HELPDESK_CATEGORIES) {
      expect(helpdeskSchema.safeParse({ category, description: "Kendala terjadi saat project dibuka." }).success).toBe(true);
    }
  });

  it("rejects descriptions shorter than 20 characters and invalid IDs", () => {
    expect(helpdeskSchema.safeParse({ category: "Akun", description: "Terlalu pendek" }).success).toBe(false);
    expect(
      helpdeskSchema.safeParse({
        category: "Akun",
        description: "Saya tidak dapat masuk ke akun saya.",
        applicationId: "bukan-uuid",
      }).success
    ).toBe(false);
  });
});
