/**
 * MockPaymentProvider — Digunakan di lingkungan development/staging.
 *
 * createCharge() mengarahkan vendor ke /pay/mock/[orderId] yang
 * menampilkan dua tombol: "Bayar sukses" dan "Gagalkan".
 * Kedua tombol memanggil POST /api/payments/webhook dengan
 * payload mock sehingga seluruh alur produksi tetap berjalan.
 */

import type {
  PaymentProvider,
  CreateChargeInput,
  CreateChargeResult,
  VerifyWebhookResult,
} from './types';

export const MOCK_WEBHOOK_SECRET = 'mock-secret-dev-only';

export class MockPaymentProvider implements PaymentProvider {
  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    return {
      providerRef: `mock_ref_${input.orderId}`,
      redirectUrl: `${baseUrl}/pay/mock/${encodeURIComponent(input.orderId)}?amount=${input.amount}&desc=${encodeURIComponent(input.description)}`,
    };
  }

  async verifyWebhook(request: Request): Promise<VerifyWebhookResult> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Mock webhook is disabled in production.');
    }

    const body = await request.json() as Record<string, unknown>;

    // Verifikasi secret minimal untuk mock
    if (body['secret'] !== MOCK_WEBHOOK_SECRET) {
      throw new Error('Mock webhook: invalid secret');
    }

    const orderId = String(body['order_id'] ?? '');
    const rawStatus = String(body['transaction_status'] ?? 'pending');

    const statusMap: Record<string, VerifyWebhookResult['status']> = {
      settlement: 'settlement',
      capture: 'capture',
      pending: 'pending',
      deny: 'deny',
      cancel: 'cancel',
      expire: 'expire',
      failure: 'failure',
    };

    return {
      orderId,
      status: statusMap[rawStatus] ?? 'pending',
      raw: body,
    };
  }
}
