import { z } from 'zod';

export const portfolioUrlSchema = z
  .string()
  .trim()
  .url('Format URL tidak valid (harus diawali http:// atau https://)');

export const talentProfileUpdateSchema = z.object({
  headline: z
    .string()
    .trim()
    .min(3, 'Headline minimal 3 karakter')
    .max(120, 'Headline maksimal 120 karakter'),
  bio: z
    .string()
    .trim()
    .max(1000, 'Bio maksimal 1000 karakter')
    .optional()
    .nullable(),
  education: z
    .string()
    .trim()
    .min(2, 'Pendidikan minimal 2 karakter')
    .max(200, 'Pendidikan maksimal 200 karakter'),
  location: z
    .string()
    .trim()
    .min(2, 'Lokasi domisili minimal 2 karakter')
    .max(100, 'Lokasi maksimal 100 karakter'),
  hoursPerWeek: z
    .number()
    .min(0, 'Minimal 0 jam per minggu')
    .max(80, 'Maksimal 80 jam per minggu'),
  preferredMode: z.enum(['remote', 'onsite', 'hybrid'], {
    message: 'Pilih preferensi mode kerja yang valid',
  }),
  isAvailable: z.boolean().default(true),
  portfolioUrls: z.array(portfolioUrlSchema).default([]),
});

export type TalentProfileUpdateInput = z.infer<typeof talentProfileUpdateSchema>;

export const talentSkillItemSchema = z.object({
  skillId: z.number().int().positive('ID skill tidak valid'),
  level: z.enum(['beginner', 'intermediate', 'advanced'], {
    message: 'Tingkat keahlian harus beginner, intermediate, atau advanced',
  }),
});

export const talentSkillsUpdateSchema = z.object({
  skills: z.array(talentSkillItemSchema),
});

export type TalentSkillItemInput = z.infer<typeof talentSkillItemSchema>;
export type TalentSkillsUpdateInput = z.infer<typeof talentSkillsUpdateSchema>;
