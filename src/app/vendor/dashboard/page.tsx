import Link from "next/link";
import { Sparkles, PlusCircle, FolderPlus } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function VendorDashboardPage() {
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
                  Vendor Dashboard
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold">Kelola Proyek & Temukan Talenta</h1>
                <p className="text-sm text-purple-100 max-w-xl">
                  Posting kebutuhan proyek organisasi/bisnis Anda dan biarkan AI mengurutkan pelamar berdasarkan skor kecocokan tertinggi.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <Link href="/vendor/projects/new">
                  <Button variant="secondary" className="gap-2 bg-white text-purple-700 hover:bg-purple-50 shadow-none">
                    <PlusCircle className="h-4 w-4" />
                    Posting Proyek Baru
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardDescription>Proyek Aktif</CardDescription>
                <CardTitle className="text-2xl font-bold text-slate-900">0</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                0 proyek berstatus open
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardDescription>Total Pelamar Masuk</CardDescription>
                <CardTitle className="text-2xl font-bold text-slate-900">0</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                Belum ada pelamar baru
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardDescription>Proyek Selesai</CardDescription>
                <CardTitle className="text-2xl font-bold text-slate-900">0</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                0 ulasan diberikan
              </CardContent>
            </Card>
          </div>

          {/* Projects Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Daftar Proyek Saya</h2>
                <p className="text-xs text-slate-500">Kelola status proyek dan evaluasi kandidat pelamar</p>
              </div>
              <Link href="/vendor/projects/new">
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5">
                  <PlusCircle className="h-4 w-4" />
                  Tambah Proyek
                </Button>
              </Link>
            </div>

            {/* Empty State */}
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600 mb-3">
                <FolderPlus className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Belum Ada Proyek yang Diposting</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Mulai buat proyek freelance atau volunteer pertama Anda untuk menarik talenta muda potensial.
              </p>
              <div className="mt-5">
                <Link href="/vendor/projects/new">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Buat Proyek Pertama
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
