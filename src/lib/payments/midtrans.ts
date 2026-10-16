/**
 * MidtransPaymentProvider — Integrasi Midtrans Snap (mode SANDBOX).
 *
 * Dokumentasi: https://docs.midtrans.com/reference/snap-api
 *
 * Verifikasi signature webhook:
 *   SHA512(order_id + status_code + gross_amount + SERVER_KEY)
 *   Harus sama dengan nilai `signature_key` di payload webhook.
 *
 * PENTING: Jika MIDTRANS_SERVER_KEY tidak diisi, modul ini tidak dapat
 * dipakai dan index.ts akan otomatis memakai MockPaymentProvider.
 */

import { createHash, timingSafeEqual } from 'crypto';
import type {
  PaymentProvider,
  CreateChargeInput,
  CreateChargeResult,
  VerifyWebhookResult,
} from './types';

const MIDTRANS_SNAP_URL_SANDBOX = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
const MIDTRANS_SNAP_URL_PRODUCTION = 'https://app.midtrans.com/snap/v1/transactions';

export function computeMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string
): string {
  return createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
}

export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
  receivedSignature: string
): boolean {
  if (!/^[a-f\d]{128}$/i.test(receivedSignature)) return false;

  const expected = Buffer.from(
    computeMidtransSignature(orderId, statusCode, grossAmount, serverKey),
    'hex'
  );
  const received = Buffer.from(receivedSignature, 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export class MidtransPaymentProvider implements PaymentProvider {
  private readonly serverKey: string;
  private readonly clientKey: string;
  private readonly isProduction: boolean;

  constructor() {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const clientKey = process.env.MIDTRANS_CLIENT_KEY;
    if (!serverKey || !clientKey) {
      throw new Error(
        'MidtransPaymentProvider: MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY harus diisi.'
      );
    }
    this.serverKey = serverKey;
    this.clientKey = clientKey;
    this.isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  }

  private get snapUrl(): string {
    return this.isProduction ? MIDTRANS_SNAP_URL_PRODUCTION : MIDTRANS_SNAP_URL_SANDBOX;
  }

  /** Basic-auth header: BASE64(serverKey + ':') */
  private get authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.serverKey}:`).toString('base64');
  }

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    const body = {
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.amount,
      },
      customer_details: {
        customer_id: input.customer.id,
        first_name: input.customer.name,
        email: input.customer.email,
      },
      item_details: [
        {
          id: input.orderId,
          price: input.amount,
          quantity: 1,
          name: input.description.slice(0, 50),
        },
      ],
    };

    const res = await fetch(this.snapUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: this.authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Midtrans createCharge error ${res.status}: ${text}`);
    }

    const data = await res.json() as { token: string; redirect_url: string };

    return {
      providerRef: data.token,
      redirectUrl: data.redirect_url,
    };
  }

  async verifyWebhook(request: Request): Promise<VerifyWebhookResult> {
    const body = await request.json() as Record<string, unknown>;

    const orderId = String(body['order_id'] ?? '');
    const statusCode = String(body['status_code'] ?? '');
    const grossAmount = String(body['gross_amount'] ?? '');
    const receivedSig = String(body['signature_key'] ?? '');

    if (
      !verifyMidtransSignature(
        orderId,
        statusCode,
        grossAmount,
        this.serverKey,
        receivedSig
      )
    ) {
      throw new Error('Midtrans webhook: invalid signature');
    }

    const rawStatus = String(body['transaction_status'] ?? 'pending');
    const fraudStatus = String(body['fraud_status'] ?? '');

    // Normalisasi: 'capture' hanya sukses jika fraud_status = 'accept'
    let status: VerifyWebhookResult['status'];
    if (rawStatus === 'capture') {
      status = fraudStatus === 'accept' ? 'capture' : 'deny';
    } else {
      const map: Record<string, VerifyWebhookResult['status']> = {
        settlement: 'settlement',
        pending: 'pending',
        deny: 'deny',
        cancel: 'cancel',
        expire: 'expire',
        failure: 'failure',
      };
      status = map[rawStatus] ?? 'pending';
    }

    return { orderId, status, raw: body };
  }
}
