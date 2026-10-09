import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Briefcase,
  Users,
  Target,
  Award,
  CheckCircle2,
  TrendingUp,
  Clock,
  Layers,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FuturisticHeroDashboard } from "@/components/futuristic-hero";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F7ECEA]">
      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-4 sm:py-8">
          <FuturisticHeroDashboard userRole="talent" />
        </section>

        {/* Value Proposition Grid */}
        <section className="border-t border-[#e8d5d0] bg-white py-16 sm:py-24">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-[#4a3728]">
                Mengapa Memilih Pathfolio?
              </h2>
              <p className="text-sm text-[#7a6559]">
                Dirancang khusus untuk memotong friksi rekrutmen proyek kecil dan memberikan jalur pengembangan nyata bagi talenta pemula.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-[#e8d5d0] hover:border-[#e0c4bc] hover:shadow-md transition-all">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-[#F7ECEA] flex items-center justify-center text-[#C98B75] mb-2">
                    <Target className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Match Score Transparan</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-[#7a6559] leading-relaxed">
                  Bukan black-box AI. Skor 0-100 dihitung dari skill required, kesesuaian level, ketersediaan jam kerja, dan rating riil.
                </CardContent>
              </Card>

              <Card className="border-[#e8d5d0] hover:border-[#e0c4bc] hover:shadow-md transition-all">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 mb-2">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Skill Gap Membangun</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-[#7a6559] leading-relaxed">
                  Menunjukkan secara spesifik skill apa yang belum terpenuhi dan level apa yang perlu kamu tingkatkan agar makin kompetitif.
                </CardContent>
              </Card>

              <Card className="border-[#e8d5d0] hover:border-[#e0c4bc] hover:shadow-md transition-all">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
                    <Award className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Reputasi Terverifikasi</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-[#7a6559] leading-relaxed">
                  Setelah proyek tuntas, vendor memberikan rating dan ulasan kualitas kerja untuk memperkuat portofolio kariermu.
                </CardContent>
              </Card>

              <Card className="border-[#e8d5d0] hover:border-[#e0c4bc] hover:shadow-md transition-all">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-[#F9F5DC] flex items-center justify-center text-[#D4B980] mb-2">
                    <Layers className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Kandidat Terkurasi Cepat</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-[#7a6559] leading-relaxed">
                  Vendor tidak perlu screening CV berjam-jam. Daftar pelamar langsung terurut dari skor kecocokan tertinggi.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Roles Section */}
        <section className="py-16 sm:py-20 bg-[#F7ECEA] border-t border-[#e8d5d0]">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid gap-8 md:grid-cols-2">
              {/* Talent Box */}
              <div className="rounded-2xl border border-[#e8d5d0] bg-white p-8 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-[#F7ECEA] flex items-center justify-center text-[#b87a65]">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-[#4a3728]">Untuk Talent</h3>
                    <p className="text-xs text-[#8a7668]">Mahasiswa, Fresh Graduate, & Pemula</p>
                  </div>
                </div>
                <ul className="space-y-2.5 text-xs text-[#7a6559] mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Temukan proyek freelance berbayar atau volunteer portofolio</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Dapatkan match score instan sebelum melamar proyek</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Rekomendasi skill gap untuk panduan belajar terarah</span>
                  </li>
                </ul>
                <Link href="/register?role=talent">
                  <Button className="w-full bg-[#C98B75] hover:bg-[#b87a65] text-white">
                    Daftar Sebagai Talent
                  </Button>
                </Link>
              </div>

              {/* Vendor Box */}
              <div className="rounded-2xl border border-[#e8d5d0] bg-white p-8 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-[#F9F5DC] flex items-center justify-center text-[#b89e5e]">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-[#4a3728]">Untuk Vendor</h3>
                    <p className="text-xs text-[#8a7668]">UMKM, Startup Kecil, & Komunitas</p>
                  </div>
                </div>
                <ul className="space-y-2.5 text-xs text-[#7a6559] mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Posting kebutuhan proyek freelance/volunteer dalam 2 menit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Lihat pelamar terurut otomatis berdasarkan kecocokan skor</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Beri rating dan ulasan performa setelah proyek selesai</span>
                  </li>
                </ul>
                <Link href="/register?role=vendor">
                  <Button variant="outline" className="w-full border-[#d4b0a5] text-[#b87a65] hover:bg-[#fdf5f2]">
                    Daftar Sebagai Vendor
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e8d5d0] bg-white py-8 text-center text-xs text-[#8a7668]">
        <div className="container mx-auto max-w-6xl px-4">
          <p>© 2026 Pathfolio — Platform AI Job &amp; Project Matchmaking.</p>
          <p className="mt-1 text-[#a89080]">
            Connecting people who need experience with opportunities that need people.
          </p>
        </div>
      </footer>
    </div>
  );
}
