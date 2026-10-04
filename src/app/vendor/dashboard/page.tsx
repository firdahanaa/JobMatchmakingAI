import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, PlusCircle, FolderCheck, Users, Briefcase, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VendorProjectsList } from "@/components/vendor/vendor-projects-list";
import { getVendorProjects } from "../projects/actions";
import { createClient } from "@/lib/supabase/server";

export default async function VendorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: projects, user, error } = await getVendorProjects();

  const totalOpen = projects.filter((p) => p.status === "open").length;
  const totalCompleted = projects.filter((p) => p.status === "completed").length;
  const totalApplicants = projects.reduce((acc, p) => acc + p.applicantCount, 0);

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
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {user?.organizationName || "Kelola Proyek & Temukan Talenta"}
                </h1>
                <p className="text-sm text-purple-100 max-w-xl">
                  Posting kebutuhan proyek organisasi Anda dan biarkan AI mengurutkan talenta muda terbaik berdasarkan Match Score keahlian.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <Link href="/vendor/projects/new">
                  <Button variant="secondary" className="gap-2 bg-white text-purple-700 hover:bg-purple-50 shadow-none font-semibold">
                    <PlusCircle className="h-4 w-4" />
                    Posting Proyek Baru
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                  Total Proyek
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {projects.length}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                Semua proyek yang pernah dibuat
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                  Proyek Terbuka (Open)
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-emerald-600">
                  {totalOpen}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                Sedang aktif menerima pelamar
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-purple-500" />
                  Total Pelamar Masuk
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-purple-700">
                  {totalApplicants}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                Lamaran siap dievaluasi
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <FolderCheck className="h-3.5 w-3.5 text-blue-500" />
                  Proyek Selesai
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {totalCompleted}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                Telah rampung dikerjakan
              </CardContent>
            </Card>
          </div>

          {/* Error Banner if any */}
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Projects Management List */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Daftar Proyek Organisasi</h2>
              <p className="text-xs text-slate-500">
                Kelola status publikasi proyek, evaluasi lamaran kandidat, atau ubah rincian tugas.
              </p>
            </div>

            <VendorProjectsList initialProjects={projects} />
          </div>
        </div>
      </main>
    </div>
  );
}
