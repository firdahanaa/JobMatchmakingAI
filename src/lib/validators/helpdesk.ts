import { z } from "zod";

export const HELPDESK_CATEGORIES = [
  "Pembayaran",
  "Lamaran",
  "Project",
  "Akun",
  "Lainnya",
] as const;

export const helpdeskSchema = z.object({
  category: z.enum(HELPDESK_CATEGORIES),
  applicationId: z.string().uuid().optional().or(z.literal("")),
  projectId: z.string().uuid().optional().or(z.literal("")),
  description: z
    .string()
    .trim()
    .min(20, "Deskripsi kendala minimal 20 karakter")
    .max(5000, "Deskripsi kendala maksimal 5000 karakter"),
});

export type HelpdeskInput = z.infer<typeof helpdeskSchema>;
