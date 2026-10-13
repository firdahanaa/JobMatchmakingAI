import { z } from "zod";

const httpUrlSchema = (message: string) =>
  z.string().trim().url("URL tidak valid").refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, message);

const uniqueUrlListSchema = (minimum: number, maximum: number, label: string) =>
  z.array(httpUrlSchema(`${label} harus menggunakan HTTP atau HTTPS`))
    .min(minimum, `${label} minimal ${minimum} link`)
    .max(maximum, `Maksimal ${maximum} ${label.toLowerCase()}`)
    .superRefine((links, context) => {
      const normalized = links.map((link) => link.toLowerCase());
      if (new Set(normalized).size !== links.length) {
        context.addIssue({ code: "custom", message: `${label} tidak boleh duplikat` });
      }
    });

export const applyApplicationSchema = z.object({
  message: z
    .string()
    .max(500, "Pesan maksimal 500 karakter")
    .optional()
    .or(z.literal("")),
  relatedLinks: uniqueUrlListSchema(0, 5, "Link terkait")
    .default([])
});

export const MAX_APPLICATION_PDF_BYTES = 5 * 1024 * 1024;

export const applicationPdfFileSchema = z
  .custom<File>(
    (file): file is File => typeof File !== "undefined" && file instanceof File,
    "File PDF wajib dipilih"
  )
  .refine((file) => file.size > 0, "File PDF tidak boleh kosong")
  .refine((file) => file.size <= MAX_APPLICATION_PDF_BYTES, "Ukuran file maksimal 5 MB")
  .refine((file) => file.type === "application/pdf", "File harus berformat PDF");

export const applicationAttachmentsSchema = z.object({
  cv: applicationPdfFileSchema,
  portfolio: applicationPdfFileSchema.nullable().optional(),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(
    ["accepted", "rejected", "submitted", "approved", "completed", "withdrawn"],
    {
      message:
        "Status lamaran harus salah satu dari: accepted, rejected, submitted, approved, completed, withdrawn",
    }
  ),
  revisionNotes: z.string().max(1000, "Catatan revisi maksimal 1000 karakter").optional(),
});

export const submitWorkDocumentationSchema = z.object({
  submissionLinks: uniqueUrlListSchema(1, 5, "Link hasil"),
  submissionNotes: z.string().max(1000, "Catatan maksimal 1000 karakter").optional(),
});

export const requestRevisionSchema = z.object({
  revisionNotes: z
    .string()
    .trim()
    .min(5, "Catatan revisi minimal 5 karakter")
    .max(1000, "Catatan revisi maksimal 1000 karakter"),
});

export const uuidSchema = z.string().uuid("ID harus berformat UUID yang valid");

export type ApplyApplicationInput = z.infer<typeof applyApplicationSchema>;
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;
export type SubmitWorkDocumentationInput = z.infer<typeof submitWorkDocumentationSchema>;
export type RequestRevisionInput = z.infer<typeof requestRevisionSchema>;

