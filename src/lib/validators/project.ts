import { z } from "zod";

export const projectSkillRequirementSchema = z.object({
  skillId: z.number().int().positive("ID skill tidak valid"),
  minLevel: z.enum(["beginner", "intermediate", "advanced"], {
    message: "Level minimal harus beginner, intermediate, atau advanced",
  }),
  isRequired: z.boolean().default(true),
});

/**
 * Schema utama project.
 *
 * Aturan bisnis yang tercermin dari CHECK constraint di database:
 *  - difficulty = 'advanced'  → payment_enabled HARUS true  &  reward_amount > 0
 *  - payment_enabled = true   → reward_amount > 0
 *  - payment_enabled = false  → reward_amount boleh 0
 */
export const projectSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5, "Judul proyek minimal 5 karakter")
      .max(150, "Judul maksimal 150 karakter"),
    description: z
      .string()
      .trim()
      .min(20, "Deskripsi proyek minimal 20 karakter"),
    difficulty: z.enum(["beginner", "intermediate", "advanced"], {
      message: "Tingkat kesulitan harus dipilih",
    }),
    type: z.enum(["freelance", "volunteer"], {
      message: "Tipe proyek harus freelance atau volunteer",
    }),
    mode: z.enum(["remote", "onsite", "hybrid"], {
      message: "Mode kerja harus dipilih",
    }),
    durationWeeks: z
      .number()
      .int("Durasi harus berupa angka bulat")
      .positive("Durasi minimal 1 minggu")
      .optional()
      .nullable(),
    hoursPerWeek: z
      .number()
      .int("Jam per minggu harus berupa angka bulat")
      .min(1, "Minimal 1 jam per minggu")
      .max(80, "Maksimal 80 jam per minggu")
      .optional()
      .nullable(),
    /** Apakah project ini menggunakan payment gateway untuk pembayaran fee. */
    paymentEnabled: z.boolean().default(false),
    /** Nominal fee dalam IDR (integer). Harus > 0 jika paymentEnabled = true. */
    rewardAmount: z
      .number()
      .int("Nominal fee harus berupa angka bulat (IDR)")
      .min(0, "Nominal fee tidak boleh negatif")
      .default(0),
    rewardNote: z
      .string()
      .trim()
      .max(200, "Catatan reward maksimal 200 karakter")
      .optional()
      .nullable(),
    /** Apakah pelamar WAJIB menyertakan file portofolio (CV selalu wajib). */
    portfolioRequired: z.boolean().default(false),
    deadline: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => {
          if (!val || val.trim() === "") return true;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const deadlineDate = new Date(val);
          return !isNaN(deadlineDate.getTime()) && deadlineDate >= today;
        },
        {
          message: "Deadline tidak boleh berada di masa lalu",
        }
      ),
    status: z
      .enum(["draft", "open", "in_progress", "completed", "closed"], {
        message: "Status proyek tidak valid",
      })
      .default("open"),
    skills: z
      .array(projectSkillRequirementSchema)
      .min(1, "Pilih minimal satu skill untuk proyek ini"),
  })
  .superRefine((data, ctx) => {
    // Aturan 1: difficulty = 'advanced' → payment_enabled wajib true
    if (data.difficulty === "advanced" && !data.paymentEnabled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paymentEnabled"],
        message: "Project Advanced wajib memiliki fee (payment_enabled harus aktif)",
      });
    }
    // Aturan 2: payment_enabled = true → reward_amount > 0
    if (data.paymentEnabled && data.rewardAmount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rewardAmount"],
        message: "Nominal fee wajib diisi dan lebih dari 0 jika project berbayar",
      });
    }
    // Aturan 3: payment_enabled = false → reward_amount harus 0
    if (!data.paymentEnabled && data.rewardAmount > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rewardAmount"],
        message: "Nominal fee harus 0 jika project tidak berbayar",
      });
    }
  });

export type ProjectInput = z.infer<typeof projectSchema>;
export type ProjectSkillRequirementInput = z.infer<typeof projectSkillRequirementSchema>;

export const projectStatusUpdateSchema = z.object({
  status: z.enum(["open", "closed", "completed"], {
    message: "Status harus open, closed, atau completed",
  }),
});

export const uuidSchema = z.string().uuid("ID harus berformat UUID yang valid");

export type ProjectStatusUpdateInput = z.infer<typeof projectStatusUpdateSchema>;

// ---------------------------------------------------------------------------
// Pure helper: validate fee/difficulty business rules — exposed for unit tests
// ---------------------------------------------------------------------------
export interface FeeRuleInput {
  difficulty: "beginner" | "intermediate" | "advanced";
  paymentEnabled: boolean;
  rewardAmount: number;
}

export type FeeRuleError =
  | "ADVANCED_REQUIRES_PAYMENT"
  | "PAYMENT_ENABLED_REQUIRES_AMOUNT"
  | "PAYMENT_DISABLED_AMOUNT_MUST_BE_ZERO";

export function validateFeeRules(input: FeeRuleInput): FeeRuleError | null {
  if (input.difficulty === "advanced" && !input.paymentEnabled) {
    return "ADVANCED_REQUIRES_PAYMENT";
  }
  if (input.paymentEnabled && input.rewardAmount <= 0) {
    return "PAYMENT_ENABLED_REQUIRES_AMOUNT";
  }
  if (!input.paymentEnabled && input.rewardAmount > 0) {
    return "PAYMENT_DISABLED_AMOUNT_MUST_BE_ZERO";
  }
  return null;
}

