/**
 * Payment provider abstraction layer
 *
 * Semua interaksi dengan gateway pembayaran harus melalui interface ini.
 * Ini memungkinkan pergantian provider (Mock ↔ Midtrans ↔ lainnya)
 * tanpa mengubah kode bisnis.
 */

export interface CreateChargeInput {
  /** ID order unik — dibuat dari record payments.id */
  orderId: string;
  /** Nominal dalam IDR (integer) */
  amount: number;
  /** Informasi pelanggan (vendor yang membayar) */
  customer: {
    id: string;
    name: string;
    email: string;
  };
  /** Deskripsi ringkas yang muncul di halaman pembayaran */
  description: string;
}

export interface CreateChargeResult {
  /** Referensi ID dari pihak provider (transaction_id, dll.) */
  providerRef: string;
  /** URL redirect ke halaman pembayaran provider */
  redirectUrl: string;
}

export type WebhookPaymentStatus =
  | 'settlement'   // Pembayaran berhasil
  | 'capture'      // Pembayaran berhasil (kartu kredit)
  | 'pending'      // Menunggu pembayaran
  | 'deny'         // Ditolak penerbit
  | 'cancel'       // Dibatalkan
  | 'expire'       // Kedaluwarsa
  | 'failure';     // Gagal teknis

export interface VerifyWebhookResult {
  /** Sama dengan orderId yang dikirim saat createCharge */
  orderId: string;
  /** Status pembayaran yang dinormalisasi */
  status: WebhookPaymentStatus;
  /** Payload mentah dari provider (untuk audit & debugging) */
  raw: Record<string, unknown>;
}

/**
 * Interface wajib diimplementasikan oleh setiap payment provider.
 */
export interface PaymentProvider {
  /**
   * Buat tagihan baru dan kembalikan URL redirect ke halaman pembayaran.
   * Dijalankan DI SERVER saat vendor menyetujui hasil kerja talent.
   */
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;

  /**
   * Verifikasi webhook dari provider dan ekstrak status pembayaran.
   * Dijalankan DI SERVER saat webhook masuk ke /api/payments/webhook.
   * Harus melempar Error jika signature tidak valid.
   */
  verifyWebhook(request: Request): Promise<VerifyWebhookResult>;
}
