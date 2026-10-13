import { describe, it, expect } from "vitest";
import {
  canTransition,
  canTransitionPayment,
  getInitialPaymentStatusOnAccept,
  getPaymentStatusOnApproval,
  getApprovalOutcome,
  getPaymentSuccessOutcome,
  getApplicationStatusLabel,
  getPaymentStatusLabel,
  getApplicationStatusBadge,
  getPaymentStatusBadge,
  APPLICATION_STATUSES,
  type WorkflowActor,
} from "./transitions";
import type { ApplicationStatus } from "@/types/database";

describe("Workflow Transitions - canTransition()", () => {
  describe("Transisi Sah (Valid)", () => {
    it("Talent: pending -> withdrawn (Talent membatalkan lamaran)", () => {
      expect(canTransition("pending", "withdrawn", "talent")).toBe(true);
    });

    it("Talent: accepted -> submitted (Talent mengirim dokumentasi pengerjaan)", () => {
      expect(canTransition("accepted", "submitted", "talent")).toBe(true);
    });

    it("Vendor: pending -> accepted (Vendor menerima pelamar)", () => {
      expect(canTransition("pending", "accepted", "vendor")).toBe(true);
    });

    it("Vendor: pending -> rejected (Vendor menolak pelamar)", () => {
      expect(canTransition("pending", "rejected", "vendor")).toBe(true);
    });

    it("Vendor: submitted -> approved (Vendor menyetujui hasil pengerjaan)", () => {
      expect(canTransition("submitted", "approved", "vendor")).toBe(true);
    });

    it("Vendor: submitted -> accepted (Vendor menolak hasil dan meminta revisi)", () => {
      expect(canTransition("submitted", "accepted", "vendor")).toBe(true);
    });

    it("Vendor: approved -> completed (Hanya sah jika proyek TIDAK punya fee)", () => {
      expect(canTransition("approved", "completed", "vendor", { hasFee: false })).toBe(true);
    });

    it("System (Webhook): approved -> completed (Pembayaran berhasil dari gateway)", () => {
      expect(
        canTransition("approved", "completed", "system", {
          hasFee: true,
          paymentStatus: "paid",
        })
      ).toBe(true);
    });
  });

  describe("Transisi Tidak Sah (Invalid)", () => {
    it("Talent dilarang melakukan aksi vendor", () => {
      expect(canTransition("pending", "accepted", "talent")).toBe(false);
      expect(canTransition("pending", "rejected", "talent")).toBe(false);
      expect(canTransition("submitted", "approved", "talent")).toBe(false);
      expect(canTransition("submitted", "accepted", "talent")).toBe(false);
      expect(canTransition("approved", "completed", "talent")).toBe(false);
      expect(canTransition("accepted", "completed", "talent")).toBe(false);
    });

    it("Vendor dilarang melakukan aksi talent", () => {
      expect(canTransition("pending", "withdrawn", "vendor")).toBe(false);
      expect(canTransition("accepted", "submitted", "vendor")).toBe(false);
    });

    it("Vendor dilarang menyelesaikan proyek berbayar tanpa lewat gateway (approved -> completed ketika hasFee=true)", () => {
      expect(canTransition("approved", "completed", "vendor", { hasFee: true })).toBe(false);
      expect(canTransition("submitted", "completed", "vendor", { hasFee: true })).toBe(false);
    });

    it("Penyelesaian harus melalui approved dan tidak bisa langsung dari submitted", () => {
      expect(canTransition("submitted", "completed", "vendor", { hasFee: false })).toBe(false);
      expect(canTransition("submitted", "completed", "system", { hasFee: false })).toBe(false);
    });

    it("Webhook tidak dapat menyelesaikan proyek berbayar sebelum pembayaran berstatus paid", () => {
      expect(canTransition("approved", "completed", "system", { hasFee: true })).toBe(false);
      expect(
        canTransition("approved", "completed", "system", {
          hasFee: true,
          paymentStatus: "awaiting_payment",
        })
      ).toBe(false);
    });

    it("Dilarang melompati alur (jumping states)", () => {
      expect(canTransition("pending", "submitted", "talent")).toBe(false);
      expect(canTransition("pending", "approved", "vendor")).toBe(false);
      expect(canTransition("pending", "completed", "vendor")).toBe(false);
      expect(canTransition("accepted", "approved", "vendor")).toBe(false);
      expect(canTransition("accepted", "completed", "vendor")).toBe(false);
    });

    it("Terminal states (completed, rejected, withdrawn) tidak bisa berpindah ke status manapun", () => {
      const terminalStates: ApplicationStatus[] = ["completed", "rejected", "withdrawn"];
      const actors: WorkflowActor[] = ["talent", "vendor", "system"];

      for (const terminal of terminalStates) {
        for (const target of APPLICATION_STATUSES) {
          for (const actor of actors) {
            expect(canTransition(terminal, target, actor)).toBe(false);
          }
        }
      }
    });

    it("Self-transition (status sama) selalu bernilai false", () => {
      expect(canTransition("pending", "pending", "vendor")).toBe(false);
      expect(canTransition("accepted", "accepted", "talent")).toBe(false);
      expect(canTransition("submitted", "submitted", "vendor")).toBe(false);
      expect(canTransition("completed", "completed", "system")).toBe(false);
    });

    it("Actor tidak dikenal menghasilkan false", () => {
      expect(canTransition("pending", "accepted", "unknown" as WorkflowActor)).toBe(false);
    });
  });
});

describe("Payment Transitions & Rules", () => {
  it("getInitialPaymentStatusOnAccept menghitung status awal dengan benar", () => {
    expect(getInitialPaymentStatusOnAccept(true)).toBe("not_requested");
    expect(getInitialPaymentStatusOnAccept(false)).toBe("none");
  });

  it("getPaymentStatusOnApproval menghitung status saat approved dengan benar", () => {
    expect(getPaymentStatusOnApproval(true)).toBe("awaiting_payment");
    expect(getPaymentStatusOnApproval(false)).toBe("none");
  });

  it("getApprovalOutcome mengembalikan state paket untuk approval", () => {
    // Proyek dengan fee
    const feeOutcome = getApprovalOutcome(true);
    expect(feeOutcome.applicationStatus).toBe("approved");
    expect(feeOutcome.paymentStatus).toBe("awaiting_payment");
    expect(feeOutcome.projectStatus).toBe("in_progress");

    // Proyek tanpa fee
    const noFeeOutcome = getApprovalOutcome(false);
    expect(noFeeOutcome.applicationStatus).toBe("completed");
    expect(noFeeOutcome.paymentStatus).toBe("none");
    expect(noFeeOutcome.projectStatus).toBe("completed");
  });

  it("getPaymentSuccessOutcome mengembalikan state paket saat webhook pembayaran sukses", () => {
    const outcome = getPaymentSuccessOutcome();
    expect(outcome.applicationStatus).toBe("completed");
    expect(outcome.paymentStatus).toBe("paid");
    expect(outcome.projectStatus).toBe("completed");
  });

  describe("canTransitionPayment()", () => {
    it("not_requested -> awaiting_payment sah oleh vendor dan system", () => {
      expect(canTransitionPayment("not_requested", "awaiting_payment", "vendor")).toBe(true);
      expect(canTransitionPayment("not_requested", "awaiting_payment", "system")).toBe(true);
      expect(canTransitionPayment("not_requested", "awaiting_payment", "talent")).toBe(false);
    });

    it("awaiting_payment -> paid HANYA sah oleh system (webhook gateway)", () => {
      expect(canTransitionPayment("awaiting_payment", "paid", "system")).toBe(true);
      expect(canTransitionPayment("awaiting_payment", "paid", "vendor")).toBe(false);
      expect(canTransitionPayment("awaiting_payment", "paid", "talent")).toBe(false);
    });

    it("Transisi pembayaran tidak sah lainnya", () => {
      expect(canTransitionPayment("none", "paid", "system")).toBe(false);
      expect(canTransitionPayment("paid", "awaiting_payment", "system")).toBe(false);
      expect(canTransitionPayment("not_requested", "paid", "system")).toBe(false);
      expect(canTransitionPayment("awaiting_payment", "awaiting_payment", "system")).toBe(false);
    });
  });
});

describe("UI Status Labels & Badges (Bahasa Indonesia)", () => {
  it("Label status pembayaran sesuai spesifikasi tepat", () => {
    expect(getPaymentStatusLabel("none")).toBe("Tidak ada pembayaran");
    expect(getPaymentStatusLabel("not_requested")).toBe("Belum ada pengajuan pembayaran");
    expect(getPaymentStatusLabel("awaiting_payment")).toBe("Menunggu pembayaran");
    expect(getPaymentStatusLabel("paid")).toBe("Pembayaran selesai");
  });

  it("Label status lamaran sesuai spesifikasi tepat", () => {
    expect(getApplicationStatusLabel("pending")).toBe("Menunggu Review");
    expect(getApplicationStatusLabel("accepted")).toBe("Diterima");
    expect(getApplicationStatusLabel("rejected")).toBe("Ditolak");
    expect(getApplicationStatusLabel("withdrawn")).toBe("Dibatalkan");
    expect(getApplicationStatusLabel("submitted")).toBe("Hasil Terkirim");
    expect(getApplicationStatusLabel("approved")).toBe("Hasil Disetujui");
    expect(getApplicationStatusLabel("completed")).toBe("Selesai");
  });

  it("Badge helpers mengembalikan format badge yang valid", () => {
    const appBadge = getApplicationStatusBadge("submitted");
    expect(appBadge.label).toBe("Hasil Terkirim");
    expect(appBadge.variant).toBe("outline");
    expect(appBadge.description).toBeTruthy();

    const payBadge = getPaymentStatusBadge("awaiting_payment");
    expect(payBadge.label).toBe("Menunggu pembayaran");
    expect(payBadge.variant).toBe("warning");
    expect(payBadge.description).toBe("Menunggu pembayaran");
  });
});
