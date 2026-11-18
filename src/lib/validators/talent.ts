import { z } from 'zod';

const monthSchema = z
  .string()
  .regex(/^$|^\d{4}-(0[1-9]|1[0-2])$/, 'Gunakan format bulan YYYY-MM');

export const educationHistoryItemSchema = z.object({
  institution: z.string().trim().min(2, 'Nama institusi minimal 2 karakter').max(150),
  degree: z.string().trim().max(100),
  fieldOfStudy: z.string().trim().max(100),
  startDate: monthSchema,
  endDate: monthSchema,
});

export const workExperienceItemSchema = z
  .object({
    company: z.string().trim().min(2, 'Nama perusahaan minimal 2 karakter').max(150),
    role: z.string().trim().min(2, 'Nama peran minimal 2 karakter').max(120),
    description: z.string().trim().max(1000),
    startDate: monthSchema,
    endDate: monthSchema,
    isCurrent: z.boolean(),
  })
  .refine((item) => !item.isCurrent || item.endDate === '', {
    message: 'Tanggal akhir harus kosong untuk pekerjaan saat ini',
    path: ['endDate'],
  });

export const portfolioUrlSchema = z
  .string()
  .trim()
  .url('Format URL tidak valid (harus diawali http:// atau https://)');

export const talentProfileUpdateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter'),
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
  educationHistory: z.array(educationHistoryItemSchema).max(10, 'Maksimal 10 riwayat pendidikan'),
  workExperience: z.array(workExperienceItemSchema).max(20, 'Maksimal 20 pengalaman kerja'),
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

export const talentOnboardingSchema = z.object({
  headline: z.string().trim().min(3, 'Headline minimal 3 karakter').max(120),
  education: z.string().trim().min(2, 'Pendidikan minimal 2 karakter').max(200),
  location: z.string().trim().min(2, 'Lokasi minimal 2 karakter').max(100),
  hoursPerWeek: z.number().int().min(1).max(80),
  preferredMode: z.enum(['remote', 'onsite', 'hybrid']),
  bio: z.string().trim().max(1000).optional(),
});

export type TalentOnboardingInput = z.infer<typeof talentOnboardingSchema>;

export const MAX_CANDIDATE_CV_BYTES = 10 * 1024 * 1024;

export const candidateCvUploadSchema = z.object({
  originalFilename: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .refine((filename) => /\.pdf$/i.test(filename), 'CV harus berupa berkas PDF')
    .refine((filename) => !/[\\/\u0000-\u001f\u007f]/.test(filename), 'Nama berkas tidak valid'),
  contentType: z.literal('application/pdf', {
    message: 'Tipe berkas harus PDF',
  }),
  fileSizeBytes: z
    .number()
    .int()
    .min(1, 'Berkas PDF kosong')
    .max(MAX_CANDIDATE_CV_BYTES, 'Ukuran CV maksimal 10 MB'),
  objectPath: z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i,
      'Lokasi berkas CV tidak valid',
    ),
});

export const candidateCvIdSchema = z.string().uuid('ID CV tidak valid');
