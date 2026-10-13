import type { ApplicationStatus, PaymentStatus, ProjectStatus } from "@/types/database";

export type WorkflowActor = "talent" | "vendor" | "system";

export interface TransitionContext {
  hasFee?: boolean;
  paymentStatus?: PaymentStatus;
  revisionNotes?: string;
}

/**
 * Valid ApplicationStatus values
 */
export const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "pending",
  "accepted",
  "rejected",
  "withdrawn",
  "submitted",
  "approved",
  "completed",
] as const;

/**
 * Valid PaymentStatus values
 */
export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  "none",
  "not_requested",
  "awaiting_payment",
  "paid",
] as const;

/**
 * Label UI (Bahasa Indonesia) untuk status lamaran
 */
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "Menunggu Review",
  accepted: "Diterima",
  rejected: "Ditolak",
  withdrawn: "Dibatalkan",
  submitted: "Hasil Terkirim",
  approved: "Hasil Disetujui",
  completed: "Selesai",
};

/**
 * Deskripsi bantuan UI (Bahasa Indonesia) untuk status lamaran
 */
export const APPLICATION_STATUS_DESCRIPTIONS: Record<ApplicationStatus, string> = {
  pending: "Lamaran telah dikirim dan sedang menunggu peninjauan oleh vendor.",
  accepted: "Lamaran telah diterima oleh vendor. Talent dapat mulai mengerjakan proyek.",
  rejected: "Vendor memilih pelamar lain untuk proyek ini.",
  withdrawn: "Lamaran telah dibatalkan oleh talenta secara mandiri.",
  submitted: "Talenta telah mengirimkan dokumentasi atau tautan hasil pengerjaan proyek.",
  approved: "Vendor telah mengonfirmasi dan menyetujui hasil pengerjaan proyek.",
  completed: "Proyek dan pengerjaan telah selesai seutuhnya.",
};

/**
 * Label UI (Bahasa Indonesia) untuk status pembayaran
 * - none = "Tidak ada pembayaran"
 * - not_requested = "Belum ada pengajuan pembayaran"
 * - awaiting_payment = "Menunggu pembayaran"
 * - paid = "Pembayaran selesai"
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  none: "Tidak ada pembayaran",
  not_requested: "Belum ada pengajuan pembayaran",
  awaiting_payment: "Menunggu pembayaran",
  paid: "Pembayaran selesai",
};

export type StatusBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning";

export const APPLICATION_STATUS_VARIANTS: Record<ApplicationStatus, StatusBadgeVariant> = {
  pending: "warning",
  accepted: "success",
  rejected: "destructive",
  withdrawn: "secondary",
  submitted: "outline",
  approved: "default",
  completed: "default",
};

export const PAYMENT_STATUS_VARIANTS: Record<PaymentStatus, StatusBadgeVariant> = {
  none: "secondary",
  not_requested: "outline",
  awaiting_payment: "warning",
  paid: "success",
};

/**
 * Fungsi murni untuk memvalidasi apakah transisi status lamaran sah.
 *
 * Aturan Transisi:
 * 1. Talent:
 *    - pending -> withdrawn (Talent membatalkan lamaran)
 *    - accepted -> submitted (Talent mengirim dokumentasi pengerjaan)
 * 2. Vendor:
 *    - pending -> accepted (Vendor menerima pelamar)
 *    - pending -> rejected (Vendor menolak pelamar)
 *    - submitted -> approved (Vendor mengonfirmasi/menyetujui hasil pengerjaan)
 *    - submitted -> accepted (Vendor meminta revisi hasil dengan catatan revisi)
 *    - approved -> completed (HANYA jika proyek tidak punya fee; jika ada fee, wajib via payment gateway)
 * 3. System (Webhook Gateway):
 *    - approved -> completed (HANYA jika payment_status sudah 'paid')
 *
 * Terminal states (completed, rejected, withdrawn) tidak dapat berpindah ke status manapun.
 */
export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  actor: WorkflowActor,
  context?: TransitionContext
): boolean {
  if (from === to) return false;

  // Terminal states cannot transition to anything
  if (from === "completed" || from === "rejected" || from === "withdrawn") {
    return false;
  }

  const hasFee = Boolean(context?.hasFee);

  switch (actor) {
    case "talent":
      if (from === "pending" && to === "withdrawn") return true;
      if (from === "accepted" && to === "submitted") return true;
      return false;

    case "vendor":
      if (from === "pending" && to === "accepted") return true;
      if (from === "pending" && to === "rejected") return true;
      if (from === "submitted" && to === "approved") return true;
      if (from === "submitted" && to === "accepted") return true; // Tolak hasil & minta revisi
      if (from === "approved" && to === "completed") {
        return !hasFee; // Jika ada fee, vendor dilarang langsung bypass payment gateway
      }
      return false;

    case "system":
      // Webhook gateway pembayaran berhasil
      if (from === "approved" && to === "completed") {
        return hasFee && context?.paymentStatus === "paid";
      }
      return false;

    default:
      return false;
  }
}

/**
 * Fungsi murni untuk memvalidasi apakah transisi status pembayaran sah.
 *
 * Aturan Transisi Pembayaran:
 * - not_requested -> awaiting_payment: sah saat vendor menyetujui hasil (vendor atau system).
 * - awaiting_payment -> paid: sah HANYA oleh system (webhook gateway pembayaran).
 */
export function canTransitionPayment(
  from: PaymentStatus,
  to: PaymentStatus,
  actor: WorkflowActor
): boolean {
  if (from === to) return false;

  if (from === "not_requested" && to === "awaiting_payment") {
    return actor === "vendor" || actor === "system";
  }

  if (from === "awaiting_payment" && to === "paid") {
    return actor === "system"; // HANYA webhook gateway pembayaran
  }

  return false;
}

/**
 * Menghitung status pembayaran awal saat vendor menerima lamaran.
 * - Jika proyek punya fee (> 0): 'not_requested'
 * - Jika proyek tanpa fee (<= 0 atau volunteer): 'none'
 */
export function getInitialPaymentStatusOnAccept(hasFee: boolean): PaymentStatus {
  return hasFee ? "not_requested" : "none";
}

/**
 * Menghitung status pembayaran saat vendor mengonfirmasi hasil pengerjaan.
 * - Jika proyek punya fee: 'awaiting_payment'
 * - Jika proyek tanpa fee: 'none'
 */
export function getPaymentStatusOnApproval(hasFee: boolean): PaymentStatus {
  return hasFee ? "awaiting_payment" : "none";
}

/**
 * Menentukan status akhir lamaran, pembayaran, dan proyek saat vendor mengonfirmasi hasil.
 * - Jika ada fee: application -> 'approved', payment -> 'awaiting_payment', project -> 'in_progress'
 * - Jika tidak ada fee: application -> 'completed', payment -> 'none', project -> 'completed'
 */
export function getApprovalOutcome(hasFee: boolean): {
  applicationStatus: ApplicationStatus;
  paymentStatus: PaymentStatus;
  projectStatus: ProjectStatus;
} {
  if (hasFee) {
    return {
      applicationStatus: "approved",
      paymentStatus: "awaiting_payment",
      projectStatus: "in_progress",
    };
  }
  return {
    applicationStatus: "completed",
    paymentStatus: "none",
    projectStatus: "completed",
  };
}

/**
 * Menentukan status akhir saat pembayaran sukses diterima via webhook.
 * - payment_status -> 'paid'
 * - application -> 'completed'
 * - project -> 'completed'
 */
export function getPaymentSuccessOutcome(): {
  applicationStatus: ApplicationStatus;
  paymentStatus: PaymentStatus;
  projectStatus: ProjectStatus;
} {
  return {
    applicationStatus: "completed",
    paymentStatus: "paid",
    projectStatus: "completed",
  };
}

/**
 * UI Helper: Label teks status lamaran (Bahasa Indonesia)
 */
export function getApplicationStatusLabel(status: ApplicationStatus): string {
  return APPLICATION_STATUS_LABELS[status] || status;
}

/**
 * UI Helper: Label teks status pembayaran (Bahasa Indonesia)
 */
export function getPaymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status] || status;
}

/**
 * UI Helper: Konfigurasi badge status lamaran
 */
export function getApplicationStatusBadge(status: ApplicationStatus): {
  label: string;
  variant: StatusBadgeVariant;
  description: string;
} {
  return {
    label: getApplicationStatusLabel(status),
    variant: APPLICATION_STATUS_VARIANTS[status] || "default",
    description: APPLICATION_STATUS_DESCRIPTIONS[status] || "",
  };
}

/**
 * UI Helper: Konfigurasi badge status pembayaran
 */
export function getPaymentStatusBadge(status: PaymentStatus): {
  label: string;
  variant: StatusBadgeVariant;
  description: string;
} {
  return {
    label: getPaymentStatusLabel(status),
    variant: PAYMENT_STATUS_VARIANTS[status] || "default",
    description: PAYMENT_STATUS_LABELS[status] || "",
  };
}
