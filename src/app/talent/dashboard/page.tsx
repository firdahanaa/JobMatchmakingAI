import Link from "next/link";
import { Sparkles, Search, User, ArrowRight, BookOpen } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function TalentDashboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Welcome Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 p-6 sm:p-8 text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium text-white backdrop-blur-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  Talent Dashboard
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold">Selamat Datang di MatchWork AI!</h1>
                <p className="text-sm text-purple-100 max-w-xl">
                  Temukan proyek yang cocok dengan skill kamu dan ketahui keahlian apa yang bisa kamu pelajari selanjutnya.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <Link href="/talent/projects">
                  <Button variant="secondary" className="gap-2 bg-white text-purple-700 hover:bg-purple-50 shadow-none">
                    <Search className="h-4 w-4" />
                    Jelajahi Proyek
                  </Button>
                </Link>
                <Link href="/talent/profile">
                  <Button variant="outline" className="border-white/40 text-white hover:bg-white/10 hover:text-white">
                    <User className="h-4 w-4" />
                    Edit Profil & Skill
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardDescription>Lamaran Aktif</CardDescription>
                <CardTitle className="text-2xl font-bold text-slate-900">0</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                Belum ada lamaran proyek aktif
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardDescription>Proyek Selesai</CardDescription>
                <CardTitle className="text-2xl font-bold text-slate-900">0</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                0 ulasan terverifikasi
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardDescription>Skor Rating Rata-rata</CardDescription>
                <CardTitle className="text-2xl font-bold text-slate-900">3.0 / 5.0</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                Skor awal netral 60% (cold-start)
              </CardContent>
            </Card>
          </div>

          {/* Placeholder Section: Recommended Projects */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Rekomendasi Proyek Untukmu</h2>
                <p className="text-xs text-slate-500">Proyek dengan Match Score tertinggi berdasarkan profil keahlianmu</p>
              </div>
              <Link href="/talent/projects">
                <Button variant="ghost" size="sm" className="gap-1 text-purple-600 hover:text-purple-700">
                  Lihat Semua
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Empty State placeholder */}
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600 mb-3">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Belum Ada Proyek Yang Dilamar</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Lengkapi keahlian di profilmu dan telusuri daftar proyek terbuka untuk mulai mengumpulkan pengalaman nyata.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <Link href="/talent/projects">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                    <Search className="h-4 w-4" />
                    Cari Proyek Sekarang
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
