import { describe, it, expect } from "vitest";
import {
  applicationAttachmentsSchema,
  applyApplicationSchema,
  MAX_APPLICATION_PDF_BYTES,
  requestRevisionSchema,
  submitWorkDocumentationSchema,
  updateApplicationStatusSchema,
  uuidSchema,
} from "./application";

describe("Application Validators", () => {
  it("menerima pesan kosong atau di bawah 500 karakter", () => {
    expect(applyApplicationSchema.safeParse({}).success).toBe(true);
    expect(applyApplicationSchema.safeParse({ message: "" }).success).toBe(true);
    expect(
      applyApplicationSchema.safeParse({
        message: "Saya sangat tertarik dengan proyek ini dan siap berkontribusi.",
      }).success
    ).toBe(true);
  });

  it("menolak pesan yang melebihi 500 karakter", () => {
    const longMessage = "a".repeat(501);
    const result = applyApplicationSchema.safeParse({ message: longMessage });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("maksimal 500 karakter");
    }
  });

  it("menerima maksimal lima link HTTP/HTTPS tanpa duplikat", () => {
    const result = applyApplicationSchema.safeParse({
      relatedLinks: ["https://portfolio.example", "http://github.com/talent"],
    });
    expect(result.success).toBe(true);
  });

  it("menolak link berlebih, protokol non-HTTP, dan duplikat", () => {
    expect(
      applyApplicationSchema.safeParse({
        relatedLinks: Array.from({ length: 6 }, (_, index) => `https://site-${index}.example`),
      }).success
    ).toBe(false);
    expect(applyApplicationSchema.safeParse({ relatedLinks: ["ftp://files.example/a"] }).success).toBe(
      false
    );
    expect(
      applyApplicationSchema.safeParse({
        relatedLinks: ["https://portfolio.example", "https://portfolio.example"],
      }).success
    ).toBe(false);
  });

  it("memvalidasi CV wajib dan portofolio opsional sebagai PDF maksimal 5 MB", () => {
    const cv = new File(["%PDF-1.7"], "cv.pdf", { type: "application/pdf" });
    expect(applicationAttachmentsSchema.safeParse({ cv, portfolio: null }).success).toBe(true);
    expect(applicationAttachmentsSchema.safeParse({ cv: null }).success).toBe(false);

    const oversized = new File([new Uint8Array(MAX_APPLICATION_PDF_BYTES + 1)], "cv.pdf", {
      type: "application/pdf",
    });
    expect(applicationAttachmentsSchema.safeParse({ cv: oversized }).success).toBe(false);

    const imageRenamedAsPdf = new File(["not a pdf"], "cv.pdf", { type: "image/png" });
    expect(applicationAttachmentsSchema.safeParse({ cv: imageRenamedAsPdf }).success).toBe(false);
  });

  it("memvalidasi update status lamaran untuk status yang diizinkan", () => {
    expect(updateApplicationStatusSchema.safeParse({ status: "accepted" }).success).toBe(true);
    expect(updateApplicationStatusSchema.safeParse({ status: "rejected" }).success).toBe(true);
    expect(updateApplicationStatusSchema.safeParse({ status: "submitted" }).success).toBe(true);
    expect(updateApplicationStatusSchema.safeParse({ status: "approved" }).success).toBe(true);
    expect(updateApplicationStatusSchema.safeParse({ status: "completed" }).success).toBe(true);
    expect(updateApplicationStatusSchema.safeParse({ status: "withdrawn" }).success).toBe(true);

    expect(updateApplicationStatusSchema.safeParse({ status: "pending" }).success).toBe(false);
    expect(updateApplicationStatusSchema.safeParse({ status: "invalid_status" }).success).toBe(false);
  });

  it("memvalidasi format UUID dengan benar", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const invalidUuid = "not-a-uuid-12345";
    expect(uuidSchema.safeParse(validUuid).success).toBe(true);
    expect(uuidSchema.safeParse(invalidUuid).success).toBe(false);
  });

  it("mewajibkan 1-5 link hasil HTTP/HTTPS yang unik", () => {
    expect(
      submitWorkDocumentationSchema.safeParse({
        submissionLinks: ["https://hasil.example"],
      }).success
    ).toBe(true);
    expect(
      submitWorkDocumentationSchema.safeParse({
        submissionLinks: Array.from({ length: 5 }, (_, index) => `https://hasil-${index}.example`),
      }).success
    ).toBe(true);
    expect(submitWorkDocumentationSchema.safeParse({ submissionLinks: [] }).success).toBe(false);
    expect(
      submitWorkDocumentationSchema.safeParse({
        submissionLinks: Array.from({ length: 6 }, (_, index) => `https://hasil-${index}.example`),
      }).success
    ).toBe(false);
    expect(
      submitWorkDocumentationSchema.safeParse({
        submissionLinks: ["https://hasil.example", "https://hasil.example"],
      }).success
    ).toBe(false);
    expect(
      submitWorkDocumentationSchema.safeParse({ submissionLinks: ["ftp://hasil.example"] }).success
    ).toBe(false);
  });

  it("mewajibkan catatan revisi dengan minimal lima karakter bermakna", () => {
    expect(requestRevisionSchema.safeParse({ revisionNotes: "Mohon tambahkan detail." }).success).toBe(
      true
    );
    expect(requestRevisionSchema.safeParse({ revisionNotes: "     " }).success).toBe(false);
    expect(requestRevisionSchema.safeParse({ revisionNotes: "cek" }).success).toBe(false);
  });
});
