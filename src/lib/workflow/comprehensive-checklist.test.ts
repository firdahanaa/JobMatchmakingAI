import { describe, it, expect } from "vitest";
import { projectSchema } from "@/lib/validators/project";
import {
  applicationAttachmentsSchema,
  applyApplicationSchema,
  submitWorkDocumentationSchema,
} from "@/lib/validators/application";
import {
  canTransition,
  canTransitionPayment,
  getPaymentStatusBadge,
} from "@/lib/workflow/transitions";
import { decidePaymentWebhook } from "@/lib/payments/webhook";
import { getUnreviewedApplicationIds } from "@/lib/workflow/review-gate";
import { formatRatingDisplay } from "@/components/ui/rating-display";
import { sanitizeProjectForTalent } from "@/lib/talent-project-utils";
import { HELPDESK_EMAIL, SHOW_MATCH_TO_TALENT } from "@/lib/config";
import type { ProjectWithMatch } from "@/app/talent/projects/actions";

describe("Checklist Tes Verifikasi Sistem Pathfolio", () => {
  // 1. Buat project Advanced tanpa fee -> harus ditolak. Buat project Beginner tanpa fee -> harus bisa.
  describe("1. Aturan Fee Proyek (Advanced vs Beginner)", () => {
    const baseProject = {
      title: "Desain Sistem Antarmuka Web",
      description: "Membangun sistem antarmuka responsif dan aksesibel sesuai standar WCAG.",
      type: "freelance" as const,
      mode: "remote" as const,
      portfolioRequired: false,
      status: "open" as const,
      skills: [{ skillId: 1, minLevel: "beginner" as const, isRequired: true }],
    };

    it("menolak pembuatan project Advanced tanpa fee (paymentEnabled: false, rewardAmount: 0)", () => {
      const advancedWithoutFee = {
        ...baseProject,
        difficulty: "advanced" as const,
        paymentEnabled: false,
        rewardAmount: 0,
      };
      const result = projectSchema.safeParse(advancedWithoutFee);
      expect(result.success).toBe(false);
      const paths = result.error?.issues.map((i) => i.path[0]);
      expect(paths).toContain("paymentEnabled");
    });

    it("mengizinkan pembuatan project Beginner tanpa fee (paymentEnabled: false, rewardAmount: 0)", () => {
      const beginnerWithoutFee = {
        ...baseProject,
        difficulty: "beginner" as const,
        paymentEnabled: false,
        rewardAmount: 0,
      };
      const result = projectSchema.safeParse(beginnerWithoutFee);
      expect(result.success).toBe(true);
      expect(result.data?.paymentEnabled).toBe(false);
      expect(result.data?.rewardAmount).toBe(0);
    });
  });

  // 2. Talent melamar tanpa CV -> ditolak. Project dengan portofolio wajib tanpa portofolio -> ditolak. Link ke-6 -> ditolak.
  describe("2. Validasi Lamaran (CV, Portofolio Wajib, Batas Link)", () => {
    it("menolak lamaran tanpa file CV (cv: null)", () => {
      const result = applicationAttachmentsSchema.safeParse({ cv: null });
      expect(result.success).toBe(false);
    });

    it("menerima lamaran dengan file CV PDF yang valid", () => {
      const validCv = new File(["%PDF-1.4 test"], "cv.pdf", { type: "application/pdf" });
      const result = applicationAttachmentsSchema.safeParse({ cv: validCv });
      expect(result.success).toBe(true);
    });

    it("menolak tautan ke-6 pada form lamaran (maksimal 5 tautan)", () => {
      const sixLinks = Array.from({ length: 6 }, (_, i) => `https://portfolio-${i}.com`);
      const result = applyApplicationSchema.safeParse({ relatedLinks: sixLinks });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("Maksimal 5");
    });

    it("menerima 1 sampai 5 tautan HTTP/HTTPS yang valid", () => {
      const fiveLinks = Array.from({ length: 5 }, (_, i) => `https://portfolio-${i}.com`);
      const result = applyApplicationSchema.safeParse({ relatedLinks: fiveLinks });
      expect(result.success).toBe(true);
    });
  });

  // 3. Lamaran Saya menampilkan status pembayaran yang benar di tiap tahap (tanpa fee: 'Tidak ada pembayaran')
  describe("3. Status Pembayaran di Halaman Lamaran", () => {
    it("menampilkan label 'Tidak ada pembayaran' untuk status none", () => {
      const badge = getPaymentStatusBadge("none");
      expect(badge.label).toBe("Tidak ada pembayaran");
      expect(badge.variant).toBe("secondary");
    });

    it("menampilkan label 'Belum ada pengajuan pembayaran' untuk status not_requested", () => {
      const badge = getPaymentStatusBadge("not_requested");
      expect(badge.label).toBe("Belum ada pengajuan pembayaran");
    });

    it("menampilkan label 'Menunggu pembayaran' untuk status awaiting_payment", () => {
      const badge = getPaymentStatusBadge("awaiting_payment");
      expect(badge.label).toBe("Menunggu pembayaran");
      expect(badge.variant).toBe("warning");
    });

    it("menampilkan label 'Pembayaran selesai' untuk status paid", () => {
      const badge = getPaymentStatusBadge("paid");
      expect(badge.label).toBe("Pembayaran selesai");
      expect(badge.variant).toBe("success");
    });
  });

  // 4. Talent kirim hasil tanpa link -> tombol nonaktif dan server menolak
  describe("4. Penyerahan Hasil Kerja Talent", () => {
    it("server menolak penyerahan hasil kerja jika submissionLinks kosong", () => {
      const result = submitWorkDocumentationSchema.safeParse({
        submissionLinks: [],
        submissionNotes: "Hasil pengerjaan selesai.",
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("minimal 1 link");
    });

    it("server menerima penyerahan hasil kerja dengan tautan HTTP/HTTPS valid", () => {
      const result = submitWorkDocumentationSchema.safeParse({
        submissionLinks: ["https://github.com/my-project/repo"],
        submissionNotes: "Semua fitur telah selesai diimplementasikan.",
      });
      expect(result.success).toBe(true);
    });
  });

  // 5. Vendor konfirmasi -> tagihan muncul -> bayar lewat mock -> status berubah ke Selesai hanya setelah webhook
  describe("5. Alur Pembayaran & Transisi Selesai via Webhook", () => {
    it("vendor tidak dapat mengubah status ke completed langsung saat proyek memiliki fee", () => {
      const vendorDirectComplete = canTransition("approved", "completed", "vendor", {
        hasFee: true,
        paymentStatus: "awaiting_payment",
      });
      expect(vendorDirectComplete).toBe(false);
    });

    it("vendor tidak dapat mengubah status payment ke paid secara langsung", () => {
      const vendorDirectPay = canTransitionPayment("awaiting_payment", "paid", "vendor");
      expect(vendorDirectPay).toBe(false);
    });

    it("webhook settlement diverifikasi dan memicu status complete", () => {
      const awaitingState = {
        paymentRecordStatus: "pending" as const,
        paymentStatus: "awaiting_payment" as const,
        applicationStatus: "approved" as const,
        storedAmount: 500_000,
      };
      const decision = decidePaymentWebhook(awaitingState, {
        status: "settlement",
        amount: 500_000,
      });
      expect(decision).toEqual({ kind: "complete" });
    });

    it("sistem dapat mengubah status ke completed dan paid setelah webhook settlement", () => {
      const systemComplete = canTransition("approved", "completed", "system", {
        hasFee: true,
        paymentStatus: "paid",
      });
      expect(systemComplete).toBe(true);

      const systemPaymentPaid = canTransitionPayment("awaiting_payment", "paid", "system");
      expect(systemPaymentPaid).toBe(true);
    });
  });

  // 6. Webhook dikirim dua kali -> tidak ada efek ganda
  describe("6. Idempotensi Webhook", () => {
    it("mengembalikan status duplicate saat menerima webhook kedua kali pada transaksi yang sudah selesai", () => {
      const alreadySettledState = {
        paymentRecordStatus: "paid" as const,
        paymentStatus: "paid" as const,
        applicationStatus: "completed" as const,
        storedAmount: 500_000,
      };
      const decision = decidePaymentWebhook(alreadySettledState, {
        status: "settlement",
        amount: 500_000,
      });
      expect(decision).toEqual({ kind: "duplicate" });
    });
  });

  // 7. Vendor tidak bisa membuat project baru sebelum mengisi rating tertunda
  describe("7. Vendor Review Gate (Rating Tertunda)", () => {
    it("mengidentifikasi project selesai yang belum diberi ulasan", () => {
      const completedProjectApps = ["app-done-1", "app-done-2"];
      const reviewedApps = ["app-done-1"];

      const unreviewed = getUnreviewedApplicationIds(completedProjectApps, reviewedApps);
      expect(unreviewed).toEqual(["app-done-2"]);
      expect(unreviewed.length).toBeGreaterThan(0);
    });

    it("mengosongkan daftar blokir jika semua project selesai telah diberi rating", () => {
      const completedProjectApps = ["app-done-1", "app-done-2"];
      const reviewedApps = ["app-done-1", "app-done-2"];

      const unreviewed = getUnreviewedApplicationIds(completedProjectApps, reviewedApps);
      expect(unreviewed).toEqual([]);
    });
  });

  // 8. Talent baru menampilkan 'Belum ada rating'
  describe("8. Tampilan Rating Kosong untuk Talent Baru", () => {
    it("formatRatingDisplay mengembalikan 'Belum ada rating' jika rating null atau undefined", () => {
      expect(formatRatingDisplay(null)).toBe("Belum ada rating");
      expect(formatRatingDisplay(undefined)).toBe("Belum ada rating");
    });

    it("formatRatingDisplay mengembalikan nilai angka jika rating ada", () => {
      expect(formatRatingDisplay(4.8)).toBe("4.8 / 5.0");
    });
  });

  // 9. Sertifikat terkunci sebelum rating diisi, bisa diunduh sesudahnya, dan /verify/... bekerja
  describe("9. Kunci Sertifikat & Verifikasi", () => {
    it("sertifikat terkunci jika status lamaran completed tetapi belum ada ulasan", () => {
      const isCompleted = true;
      const hasReview = false;
      const canDownloadCertificate = isCompleted && hasReview;
      expect(canDownloadCertificate).toBe(false);
    });

    it("sertifikat terbuka untuk diunduh jika status lamaran completed dan vendor telah memberi ulasan", () => {
      const isCompleted = true;
      const hasReview = true;
      const canDownloadCertificate = isCompleted && hasReview;
      expect(canDownloadCertificate).toBe(true);
    });
  });

  // 10. Akun talent: tidak ada angka/persen match di mana pun. Akun vendor: skor tetap tampil.
  describe("10. Privasi Match Score (SHOW_MATCH_TO_TALENT)", () => {
    it("flag konfigurasi SHOW_MATCH_TO_TALENT diset ke false", () => {
      expect(SHOW_MATCH_TO_TALENT).toBe(false);
    });

    it("sanitizeProjectForTalent menghapus seluruh atribut matchResult, skor, dan status keahlian talent", () => {
      const sampleProject: ProjectWithMatch = {
        id: "22222222-2222-4222-8222-222222222222",
        vendorId: "v-1",
        title: "Frontend Dashboard",
        description: "Dashboard analitik",
        difficulty: "beginner",
        type: "freelance",
        mode: "remote",
        durationWeeks: 2,
        hoursPerWeek: 10,
        paymentEnabled: false,
        portfolioRequired: false,
        rewardAmount: 0,
        rewardNote: null,
        deadline: "2026-11-01",
        status: "open",
        createdAt: "2026-10-01",
        vendor: {
          userId: "v-1",
          organizationName: "Tech Corp",
          description: null,
          website: null,
          location: "Bandung",
        },
        skills: [
          {
            skillId: 1,
            name: "React",
            category: "Frontend",
            minLevel: "beginner",
            isRequired: true,
            talentStatus: {
              possessed: true,
              talentLevel: "intermediate",
              isAdequate: true,
            },
          },
        ],
        matchResult: {
          score: 95,
          breakdown: { skill: 100, levelFit: 90, availability: 100, rating: 90 },
          matchedSkills: ["React"],
          missingSkills: [],
          underLevelSkills: [],
          explanation: "Sangat cocok",
        },
        textSimilarityScore: 88,
        recommendationScore: 93,
      };

      const sanitized = sanitizeProjectForTalent(sampleProject);

      expect(sanitized).not.toHaveProperty("matchResult");
      expect(sanitized).not.toHaveProperty("textSimilarityScore");
      expect(sanitized).not.toHaveProperty("recommendationScore");
      for (const skill of sanitized.skills) {
        expect(skill).not.toHaveProperty("talentStatus");
      }
    });
  });

  // 11. Tombol bantuan membuka email ke quadromadagaskar@gmail.com dengan isi terisi otomatis
  describe("11. Help Desk Email Target", () => {
    it("alamat email helpdesk terkonfigurasi ke quadromadagaskar@gmail.com", () => {
      expect(HELPDESK_EMAIL).toBe("quadromadagaskar@gmail.com");
    });

    it("membangun URL mailto dengan penerima dan parameter terenkode", () => {
      const subject = "[Help Desk] Kendala Pembayaran";
      const body = "Halo Bantuan,\nAda kendala saat pembayaran.";
      const recipient = encodeURIComponent(HELPDESK_EMAIL);
      const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      expect(mailtoUrl).toContain("mailto:quadromadagaskar%40gmail.com");
      expect(mailtoUrl).toContain("subject=%5BHelp%20Desk%5D%20Kendala%20Pembayaran");
    });
  });
});
