import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  role: z.enum(['talent', 'vendor'], {
    message: 'Pilih role sebagai Talent atau Vendor',
  }),
  acceptTerms: z.boolean().refine((accepted) => accepted, 'Persetujuan wajib dicentang'),
}).refine((values) => values.password === values.confirmPassword, {
  message: 'Konfirmasi password tidak cocok',
  path: ['confirmPassword'],
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export type LoginInput = z.infer<typeof loginSchema>;
