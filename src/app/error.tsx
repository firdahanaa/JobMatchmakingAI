"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global app error caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7ECEA] px-4 text-center">
      <div className="max-w-md w-full rounded-2xl border border-rose-200 bg-white p-8 shadow-sm space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#4a3728] tracking-tight">
            Terjadi Kesalahan
          </h2>
          <p className="text-sm text-[#7a6559] leading-relaxed">
            Terjadi kendala teknis saat memproses permintaan Anda. Silakan coba muat ulang halaman.
          </p>
          {error.message && (
            <div className="p-3 bg-[#F7ECEA] rounded-xl border border-[#e8d5d0] text-xs font-mono text-[#7a6559] text-left overflow-x-auto max-h-24">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto gap-2 bg-[#C98B75] hover:bg-[#b87a65] text-white font-semibold"
          >
            <RotateCcw className="h-4 w-4" />
            Coba Lagi
          </Button>

          <Link href="/" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full gap-2 border-[#d4b0a5] font-semibold">
              <Home className="h-4 w-4" />
              Kembali ke Beranda
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
