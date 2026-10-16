/**
 * Payment provider selector.
 *
 * Dibaca dari env PAYMENT_PROVIDER ('mock' | 'midtrans'), default 'mock'.
 * Jika dipilih 'midtrans' namun kredensial belum diisi, fallback ke mock
 * dengan peringatan di log (aman untuk development).
 */

import type { PaymentProvider } from './types';
import { MockPaymentProvider } from './mock';

export type { PaymentProvider, CreateChargeInput, CreateChargeResult, VerifyWebhookResult, WebhookPaymentStatus } from './types';

let _instance: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (_instance) return _instance;

  const providerEnv = (process.env.PAYMENT_PROVIDER ?? 'mock').toLowerCase();

  if (providerEnv === 'midtrans') {
    try {
      // Dynamic require agar MidtransPaymentProvider tidak diinisialisasi
      // kecuali benar-benar diperlukan (menghindari throw saat build-time).
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { MidtransPaymentProvider } = require('./midtrans') as typeof import('./midtrans');
      _instance = new MidtransPaymentProvider();
      return _instance;
    } catch (err) {
      console.warn(
        '[payments] Gagal membuat MidtransPaymentProvider. Menggunakan MockPaymentProvider sebagai fallback.\n',
        err instanceof Error ? err.message : err
      );
    }
  }

  _instance = new MockPaymentProvider();
  return _instance;
}

export function getPaymentProviderName(): 'mock' | 'midtrans' {
  return getPaymentProvider() instanceof MockPaymentProvider ? 'mock' : 'midtrans';
}

/** Reset singleton — hanya untuk unit test */
export function _resetPaymentProvider(): void {
  _instance = null;
}
