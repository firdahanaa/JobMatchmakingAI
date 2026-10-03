import { z } from 'zod';

export const talentProfileSchema = z.object({
  fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  headline: z.string().max(120, 'Headline maksimal 120 karakter').optional().nullable(),
  bio: z.string().max(1000, 'Bio maksimal 1000 karakter').optional().nullable(),
  education: z.string().max(200, 'Pendidikan maksimal 200 karakter').optional().nullable(),
  location: z.string().max(100, 'Lokasi maksimal 100 karakter').optional().nullable(),
  hoursPerWeek: z
    .number()
    .min(0, 'Minimal 0 jam')
    .max(80, 'Maksimal 80 jam per minggu')
    .optional()
    .nullable(),
  preferredMode: z.enum(['remote', 'onsite', 'hybrid']).optional().nullable(),
  isAvailable: z.boolean().default(true),
  portfolioUrls: z.array(z.string().url('Format URL portofolio tidak valid')).default([]),
});

export type TalentProfileInput = z.infer<typeof talentProfileSchema>;

export const talentOnboardingSchema = z.object({
  headline: z.string().min(3, 'Headline wajib diisi (mis. Frontend Developer Jr.)').max(120, 'Maksimal 120 karakter'),
  education: z.string().min(2, 'Pendidikan/kampus wajib diisi').max(200, 'Maksimal 200 karakter'),
  location: z.string().min(2, 'Lokasi domisili wajib diisi (mis. Jakarta/Bandung)').max(100, 'Maksimal 100 karakter'),
  hoursPerWeek: z
    .number()
    .min(1, 'Minimal 1 jam per minggu')
    .max(80, 'Maksimal 80 jam per minggu'),
  preferredMode: z.enum(['remote', 'onsite', 'hybrid'], {
    message: 'Pilih preferensi mode kerja',
  }),
  bio: z.string().max(1000, 'Bio maksimal 1000 karakter').optional().nullable(),
});

export type TalentOnboardingInput = z.infer<typeof talentOnboardingSchema>;

export const talentSkillInputSchema = z.object({
  skillId: z.number().int().positive('ID skill tidak valid'),
  level: z.enum(['beginner', 'intermediate', 'advanced'], {
    message: 'Tingkat keahlian harus beginner, intermediate, atau advanced',
  }),
});

export type TalentSkillInput = z.infer<typeof talentSkillInputSchema>;

export const vendorProfileSchema = z.object({
  organizationName: z.string().min(2, 'Nama organisasi minimal 2 karakter'),
  description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional().nullable(),
  website: z.string().url('Format website tidak valid').optional().nullable().or(z.literal('')),
  location: z.string().max(100, 'Lokasi maksimal 100 karakter').optional().nullable(),
});

export type VendorProfileInput = z.infer<typeof vendorProfileSchema>;

export const vendorOnboardingSchema = z.object({
  organizationName: z.string().min(2, 'Nama organisasi/bisnis minimal 2 karakter').max(100, 'Maksimal 100 karakter'),
  description: z.string().min(10, 'Deskripsi organisasi minimal 10 karakter').max(1000, 'Maksimal 1000 karakter'),
  location: z.string().min(2, 'Lokasi kota/kabupaten wajib diisi').max(100, 'Maksimal 100 karakter'),
  website: z.string().url('Format website tidak valid (gunakan http/https)').optional().nullable().or(z.literal('')),
});

export type VendorOnboardingInput = z.infer<typeof vendorOnboardingSchema>;
