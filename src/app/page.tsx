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

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              
              {/* Left Column: Headline & Action */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-semibold text-purple-700">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                  <span>Connecting people who need experience with opportunities that need people</span>
                </div>

                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                  Hubungkan Ambisi dengan <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 bg-clip-text text-transparent">Peluang Nyata</span>
                </h1>

                <p className="text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Job seeker butuh pengalaman untuk bekerja, tetapi kerja butuh pengalaman. 
                  MatchWork AI mempertemukan mahasiswa, fresh graduate, dan freelancer pemula dengan UMKM & startup lewat proyek freelance atau volunteer dengan match score dan skill gap transparan.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                  <Link href="/register?role=talent" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto gap-2 bg-purple-600 hover:bg-purple-700 text-white text-base shadow-md shadow-purple-100">
                      Mulai Sebagai Talent
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>

                  <Link href="/register?role=vendor" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto text-base border-slate-300">
                      Posting Proyek Vendor
                    </Button>
                  </Link>
                </div>

                <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Match Score Transparan
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Analisis Skill Gap Cerdas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Rating Terverifikasi
                  </span>
                </div>
              </div>

              {/* Right Column: Live Matchmaking Card Mockup */}
              <div className="lg:col-span-5">
                <div className="relative mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-700 font-bold">
                        KB
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">Kopi Bersama Nusantara</h4>
                        <p className="text-xs text-slate-500">UMKM F&B • Bandung (Remote)</p>
                      </div>
                    </div>
                    <Badge variant="success" className="gap-1">
                      Freelance
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    <h3 className="font-bold text-slate-900 text-base">
                      Pembuatan Dashboard Penjualan & Analisis Konsumen
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      Membantu merapikan data transaksi POS bulanan dan menyajikan visualisasi data penjualan agar mudah dipahami tim operasional.
                    </p>
                  </div>

                  {/* Match Score Indicator */}
                  <div className="mt-5 rounded-xl bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/80 p-4 border border-purple-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-purple-600" />
                        <span className="text-xs font-semibold text-purple-900 uppercase tracking-wide">
                          AI Match Score
                        </span>
                      </div>
                      <span className="text-2xl font-black text-purple-700">92%</span>
                    </div>

                    <div className="mt-2 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                    </div>

                    <p className="mt-2.5 text-xs text-purple-950 font-medium leading-relaxed">
                      Kamu memenuhi 3 dari 4 skill utama. Sangat cocok dengan estimasi 15 jam/minggu.
                    </p>
                  </div>

                  {/* Skill Gap Section */}
                  <div className="mt-4 rounded-xl bg-amber-50/70 p-3.5 border border-amber-200/80">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                      <TrendingUp className="h-3.5 w-3.5 text-amber-700" />
                      <span>Skill Gap yang Perlu Ditingkatkan</span>
                    </div>
                    <p className="mt-1 text-xs text-amber-800 leading-snug">
                      Tingkatkan kemampuan <span className="font-semibold text-amber-950">Power BI</span> dari Pemula ke Menengah untuk skor maksimal 98%.
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> 3 Minggu (15 jam/mgg)
                    </span>
                    <span className="font-semibold text-slate-900">
                      Rp 1.500.000
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Value Proposition Grid */}
        <section className="border-t border-slate-200 bg-white py-16 sm:py-24">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Mengapa Memilih MatchWork AI?
              </h2>
              <p className="text-sm text-slate-600">
                Dirancang khusus untuk memotong friksi rekrutmen proyek kecil dan memberikan jalur pengembangan nyata bagi talenta pemula.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-slate-200 hover:border-purple-200 hover:shadow-md transition-all">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 mb-2">
                    <Target className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Match Score Transparan</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 leading-relaxed">
                  Bukan black-box AI. Skor 0-100 dihitung dari skill required, kesesuaian level, ketersediaan jam kerja, dan rating riil.
                </CardContent>
              </Card>

              <Card className="border-slate-200 hover:border-purple-200 hover:shadow-md transition-all">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 mb-2">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Skill Gap Membangun</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 leading-relaxed">
                  Menunjukkan secara spesifik skill apa yang belum terpenuhi dan level apa yang perlu kamu tingkatkan agar makin kompetitif.
                </CardContent>
              </Card>

              <Card className="border-slate-200 hover:border-purple-200 hover:shadow-md transition-all">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
                    <Award className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Reputasi Terverifikasi</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 leading-relaxed">
                  Setelah proyek tuntas, vendor memberikan rating dan ulasan kualitas kerja untuk memperkuat portofolio kariermu.
                </CardContent>
              </Card>

              <Card className="border-slate-200 hover:border-purple-200 hover:shadow-md transition-all">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2">
                    <Layers className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Kandidat Terkurasi Cepat</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 leading-relaxed">
                  Vendor tidak perlu screening CV berjam-jam. Daftar pelamar langsung terurut dari skor kecocokan tertinggi.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Roles Section */}
        <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid gap-8 md:grid-cols-2">
              {/* Talent Box */}
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-slate-900">Untuk Talent</h3>
                    <p className="text-xs text-slate-500">Mahasiswa, Fresh Graduate, & Pemula</p>
                  </div>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 mb-6">
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
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    Daftar Sebagai Talent
                  </Button>
                </Link>
              </div>

              {/* Vendor Box */}
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-slate-900">Untuk Vendor</h3>
                    <p className="text-xs text-slate-500">UMKM, Startup Kecil, & Komunitas</p>
                  </div>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 mb-6">
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
                  <Button variant="outline" className="w-full border-purple-300 text-purple-700 hover:bg-purple-50">
                    Daftar Sebagai Vendor
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="container mx-auto max-w-6xl px-4">
          <p>© 2026 MatchWork AI — Platform AI Job & Project Matchmaking.</p>
          <p className="mt-1 text-slate-400">
            Connecting people who need experience with opportunities that need people.
          </p>
        </div>
      </footer>
    </div>
  );
}
