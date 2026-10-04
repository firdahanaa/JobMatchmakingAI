import { z } from "zod";

export const projectSkillRequirementSchema = z.object({
  skillId: z.number().int().positive("ID skill tidak valid"),
  minLevel: z.enum(["beginner", "intermediate", "advanced"], {
    message: "Level minimal harus beginner, intermediate, atau advanced",
  }),
  isRequired: z.boolean().default(true),
});

export const projectSchema = z.object({
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
  rewardAmount: z
    .number()
    .min(0, "Nilai reward tidak boleh negatif")
    .optional()
    .nullable(),
  rewardNote: z
    .string()
    .trim()
    .max(200, "Catatan reward maksimal 200 karakter")
    .optional()
    .nullable(),
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
        // Valid date and not before today
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

