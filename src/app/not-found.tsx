import Link from "next/link";
import { Compass, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="max-w-md w-full space-y-6">
        {/* Visual Icon Badge */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-purple-100 text-purple-700 shadow-sm border border-purple-200">
          <Compass className="h-10 w-10 animate-spin-slow" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
            Error 404
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Maaf, halaman yang Anda tuju tidak tersedia atau telah dipindahkan. Silakan periksa kembali tautan Anda.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/" className="w-full sm:w-auto">
            <Button className="w-full gap-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold">
              <Home className="h-4 w-4" />
              Kembali ke Beranda
            </Button>
          </Link>
          <Link href="/talent/projects" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full gap-2 border-slate-300 font-semibold">
              <Search className="h-4 w-4" />
              Jelajahi Proyek
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
