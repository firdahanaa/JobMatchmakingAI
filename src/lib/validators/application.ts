import { z } from 'zod';

export const applicationSchema = z.object({
  projectId: z.string().uuid('ID proyek tidak valid'),
  message: z
    .string()
    .min(10, 'Pesan lamaran minimal 10 karakter')
    .max(1000, 'Pesan lamaran maksimal 1000 karakter'),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
