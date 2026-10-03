import { z } from 'zod';

export const projectSkillRequirementSchema = z.object({
  skillId: z.number().int().positive('ID skill tidak valid'),
  minLevel: z.enum(['beginner', 'intermediate', 'advanced'], {
    message: 'Level minimal harus beginner, intermediate, atau advanced',
  }),
  isRequired: z.boolean().default(true),
});

export const projectSchema = z.object({
  title: z.string().min(5, 'Judul proyek minimal 5 karakter').max(150, 'Judul maksimal 150 karakter'),
  description: z.string().min(20, 'Deskripsi proyek minimal 20 karakter'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced'], {
    message: 'Tingkat kesulitan harus dipilih',
  }),
  type: z.enum(['freelance', 'volunteer'], {
    message: 'Tipe proyek harus freelance atau volunteer',
  }),
  mode: z.enum(['remote', 'onsite', 'hybrid'], {
    message: 'Mode kerja harus dipilih',
  }),
  durationWeeks: z
    .number()
    .int()
    .positive('Durasi minimal 1 minggu')
    .optional()
    .nullable(),
  hoursPerWeek: z
    .number()
    .int()
    .min(1, 'Minimal 1 jam per minggu')
    .max(80, 'Maksimal 80 jam per minggu')
    .optional()
    .nullable(),
  rewardAmount: z.number().min(0, 'Nilai reward tidak boleh negatif').optional().nullable(),
  rewardNote: z.string().max(200, 'Catatan reward maksimal 200 karakter').optional().nullable(),
  deadline: z.string().optional().nullable(),
  skills: z.array(projectSkillRequirementSchema).min(1, 'Pilih minimal satu skill untuk proyek ini'),
});

export type ProjectInput = z.infer<typeof projectSchema>;
