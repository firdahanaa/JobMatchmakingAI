import { z } from 'zod';

export const reviewSchema = z.object({
  applicationId: z.string().uuid('ID aplikasi tidak valid'),
  rating: z.number().int().min(1, 'Rating minimal 1 bintang').max(5, 'Rating maksimal 5 bintang'),
  quality: z.number().int().min(1).max(5).optional().nullable(),
  timeliness: z.number().int().min(1).max(5).optional().nullable(),
  communication: z.number().int().min(1).max(5).optional().nullable(),
  comment: z.string().max(1000, 'Ulasan maksimal 1000 karakter').optional().nullable(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
