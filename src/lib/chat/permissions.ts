import type { ApplicationStatus } from "@/types/database";

/**
 * Memeriksa apakah status lamaran saat ini mengizinkan pengiriman pesan.
 * Status aktif: pending, accepted, submitted, approved.
 * Status terminal (hanya-baca): rejected, withdrawn, completed.
 */
export function canSendMessage(status: ApplicationStatus): boolean {
  switch (status) {
    case "pending":
    case "accepted":
    case "submitted":
    case "approved":
      return true;
    case "rejected":
    case "withdrawn":
    case "completed":
    default:
      return false;
  }
}

/**
 * Menghasilkan teks pemberitahuan saat percakapan berada dalam mode hanya-baca.
 */
export function getChatNotice(status: ApplicationStatus): string | null {
  switch (status) {
    case "rejected":
      return "Percakapan ini hanya dapat dibaca karena lamaran tidak diterima.";
    case "withdrawn":
      return "Percakapan ini hanya dapat dibaca karena lamaran telah dibatalkan oleh talent.";
    case "completed":
      return "Percakapan ini hanya dapat dibaca karena lamaran sudah selesai.";
    default:
      return null;
  }
}
