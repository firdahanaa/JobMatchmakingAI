/**
 * Halaman simulasi pembayaran untuk MockPaymentProvider.
 * Hanya aktif di lingkungan development / staging.
 */
"use client";

import * as React from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function MockPaymentPage() {
  const params = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = decodeURIComponent(params.orderId);
  const amount = Number(searchParams.get("amount") ?? 0);
  const desc = searchParams.get("desc") ?? "Pembayaran proyek";

  const [loading, setLoading] = React.useState<"success" | "fail" | null>(null);

  const simulate = React.useCallback(
    async (succeed: boolean) => {
      const status = succeed ? "settlement" : "expire";
      setLoading(succeed ? "success" : "fail");

      try {
        const res = await fetch("/api/payments/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: orderId,
            transaction_status: status,
            status_code: succeed ? "200" : "407",
            gross_amount: String(amount),
            secret: "mock-secret-dev-only",
            _mock_page: true,
          }),
        });

        const json = (await res.json()) as { ok: boolean; error?: string };

        if (json.ok) {
          toast.success(
            succeed
              ? "Simulasi pembayaran berhasil! Halaman ini akan ditutup."
              : "Simulasi pembayaran gagal/expired."
          );
          setTimeout(() => router.push("/vendor/dashboard"), 1800);
        } else {
          toast.error(json.error ?? "Terjadi kesalahan saat memproses webhook.");
        }
      } catch {
        toast.error("Gagal menghubungi server. Coba lagi.");
      } finally {
        setLoading(null);
      }
    },
    [orderId, amount, router]
  );

  if (process.env.NODE_ENV === "production") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7ECEA]">
        <div className="text-center p-8 rounded-2xl bg-white border border-rose-200 shadow max-w-sm">
          <ShieldAlert className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <h1 className="font-bold text-[#4a3728] text-lg">Halaman tidak tersedia</h1>
          <p className="text-sm text-[#8a7668] mt-1">Halaman simulasi pembayaran tidak dapat diakses di lingkungan produksi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7ECEA] to-[#e8d5d0] p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-[#e8d5d0] max-w-md w-full overflow-hidden">
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Lingkungan Development</p>
            <p className="text-xs text-amber-600">Ini bukan gateway pembayaran nyata. Hanya untuk pengujian.</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h1 className="text-xl font-bold text-[#4a3728]">Simulasi Pembayaran</h1>
            <p className="text-xs text-[#8a7668] mt-0.5">MockPaymentProvider</p>
          </div>

          <div className="rounded-xl border border-[#e8d5d0] bg-[#F7ECEA]/50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#8a7668]">Order ID</span>
              <span className="font-mono text-xs text-[#5c4639] break-all text-right max-w-[180px]">{orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8a7668]">Deskripsi</span>
              <span className="text-[#5c4639] text-right max-w-[180px]">{desc}</span>
            </div>
            <div className="flex justify-between items-center border-t border-[#e8d5d0] pt-2 mt-1">
              <span className="font-semibold text-[#4a3728]">Total</span>
              <span className="font-bold text-lg text-emerald-700">Rp {amount.toLocaleString("id-ID")}</span>
            </div>
          </div>

          <p className="text-xs text-[#8a7668] text-center">Pilih skenario yang ingin disimulasikan:</p>

          <div className="grid grid-cols-2 gap-3">
            <button
              id="mock-pay-success"
              type="button"
              disabled={loading !== null}
              onClick={() => simulate(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading === "success" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Simulasikan bayar sukses
            </button>

            <button
              id="mock-pay-fail"
              type="button"
              disabled={loading !== null}
              onClick={() => simulate(false)}
              className="flex items-center justify-center gap-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 font-semibold py-3 text-sm transition-colors border border-rose-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading === "fail" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Simulasikan gagal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}