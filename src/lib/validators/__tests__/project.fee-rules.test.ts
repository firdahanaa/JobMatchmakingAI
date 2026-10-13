import { describe, it, expect } from "vitest";
import { validateFeeRules, projectSchema } from "../project";

// ---------------------------------------------------------------------------
// Unit tests: validateFeeRules() pure helper
// ---------------------------------------------------------------------------
describe("validateFeeRules()", () => {
  it("returns null for valid beginner + payment disabled + amount 0", () => {
    expect(
      validateFeeRules({ difficulty: "beginner", paymentEnabled: false, rewardAmount: 0 })
    ).toBeNull();
  });

  it("returns null for valid intermediate + payment disabled + amount 0", () => {
    expect(
      validateFeeRules({ difficulty: "intermediate", paymentEnabled: false, rewardAmount: 0 })
    ).toBeNull();
  });

  it("returns null for valid beginner + payment enabled + amount > 0", () => {
    expect(
      validateFeeRules({ difficulty: "beginner", paymentEnabled: true, rewardAmount: 500_000 })
    ).toBeNull();
  });

  it("returns null for valid advanced + payment enabled + amount > 0", () => {
    expect(
      validateFeeRules({ difficulty: "advanced", paymentEnabled: true, rewardAmount: 1_500_000 })
    ).toBeNull();
  });

  it("ADVANCED_REQUIRES_PAYMENT when difficulty=advanced and paymentEnabled=false", () => {
    expect(
      validateFeeRules({ difficulty: "advanced", paymentEnabled: false, rewardAmount: 0 })
    ).toBe("ADVANCED_REQUIRES_PAYMENT");
  });

  it("PAYMENT_ENABLED_REQUIRES_AMOUNT when paymentEnabled=true and rewardAmount=0", () => {
    expect(
      validateFeeRules({ difficulty: "beginner", paymentEnabled: true, rewardAmount: 0 })
    ).toBe("PAYMENT_ENABLED_REQUIRES_AMOUNT");
  });

  it("PAYMENT_ENABLED_REQUIRES_AMOUNT when paymentEnabled=true and rewardAmount negative", () => {
    expect(
      validateFeeRules({ difficulty: "intermediate", paymentEnabled: true, rewardAmount: -1 })
    ).toBe("PAYMENT_ENABLED_REQUIRES_AMOUNT");
  });

  it("PAYMENT_DISABLED_AMOUNT_MUST_BE_ZERO when paymentEnabled=false and rewardAmount > 0", () => {
    expect(
      validateFeeRules({ difficulty: "beginner", paymentEnabled: false, rewardAmount: 100_000 })
    ).toBe("PAYMENT_DISABLED_AMOUNT_MUST_BE_ZERO");
  });
});

// ---------------------------------------------------------------------------
// Unit tests: projectSchema superRefine cross-field rules
// ---------------------------------------------------------------------------
const BASE_VALID = {
  title: "Proyek Valid Cukup Panjang",
  description: "Ini adalah deskripsi proyek yang cukup panjang untuk validasi.",
  difficulty: "beginner" as const,
  type: "freelance" as const,
  mode: "remote" as const,
  paymentEnabled: false,
  rewardAmount: 0,
  portfolioRequired: false,
  status: "open" as const,
  skills: [{ skillId: 1, minLevel: "beginner" as const, isRequired: true }],
};

describe("projectSchema superRefine — fee rules", () => {
  it("passes for beginner project with no fee", () => {
    const result = projectSchema.safeParse(BASE_VALID);
    expect(result.success).toBe(true);
  });

  it("passes for advanced project with payment enabled and fee > 0", () => {
    const result = projectSchema.safeParse({
      ...BASE_VALID,
      difficulty: "advanced",
      paymentEnabled: true,
      rewardAmount: 2_000_000,
    });
    expect(result.success).toBe(true);
  });

  it("fails when difficulty=advanced but paymentEnabled=false", () => {
    const result = projectSchema.safeParse({
      ...BASE_VALID,
      difficulty: "advanced",
      paymentEnabled: false,
      rewardAmount: 0,
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toContain("paymentEnabled");
  });

  it("fails when paymentEnabled=true but rewardAmount=0", () => {
    const result = projectSchema.safeParse({
      ...BASE_VALID,
      paymentEnabled: true,
      rewardAmount: 0,
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toContain("rewardAmount");
  });

  it("fails when paymentEnabled=false but rewardAmount > 0", () => {
    const result = projectSchema.safeParse({
      ...BASE_VALID,
      paymentEnabled: false,
      rewardAmount: 500_000,
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toContain("rewardAmount");
  });

  it("portfolioRequired defaults to false and is accepted as true", () => {
    const result = projectSchema.safeParse({
      ...BASE_VALID,
      portfolioRequired: true,
    });
    expect(result.success).toBe(true);
    expect(result.data?.portfolioRequired).toBe(true);
  });
});
