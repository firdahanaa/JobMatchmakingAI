import { z } from "zod";

export const applyApplicationSchema = z.object({
  message: z
    .string()
    .max(500, "Pesan maksimal 500 karakter")
    .optional()
    .or(z.literal("")),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(["accepted", "rejected", "completed"], {
    message: "Status lamaran harus salah satu dari: accepted, rejected, completed",
  }),
});

export const uuidSchema = z.string().uuid("ID harus berformat UUID yang valid");

export type ApplyApplicationInput = z.infer<typeof applyApplicationSchema>;
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;

