import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  Sparkles,
  FolderCheck,
  Users,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VendorProjectsList } from "@/components/vendor/vendor-projects-list";
import { getVendorProjects } from "../projects/actions";
import { createClient } from "@/lib/supabase/server";

import { FuturisticHeroDashboard } from "@/components/futuristic-hero";

export const metadata: Metadata = {
  title: "Dashboard Vendor",
  description: "Kelola proyek, pantau pelamar teratas berbasis AI Matchmaking, dan kelola status tugas.",
};

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

  const topVendorProject = projects[0] ? {
    id: projects[0].id,
    title: projects[0].title,
    orgName: user?.organizationName || "Organisasi Vendor",
    location: `Bandung (${projects[0].mode === "remote" ? "Remote" : "Onsite"})`,
    stipend: projects[0].type === "freelance"
      ? `Rp ${projects[0].reward_amount?.toLocaleString("id-ID")}`
      : "Sertifikat & Portofolio",
    duration: `${projects[0].duration_weeks || 4} Minggu (${projects[0].hours_per_week || 15} jam/mgg)`,
    matchScore: 98,
    description: projects[0].description,
    workMode: projects[0].mode,
  } : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7ECEA]">
      <main className="flex-1 py-2 sm:py-6 px-1 sm:px-3 lg:px-6 space-y-8">
        {/* Futuristic Hero Banner (Orizon Inspired - Full Bleed Width) */}
        <div className="w-full">
          <FuturisticHeroDashboard
            userRole="vendor"
            topProject={topVendorProject}
            stats={{
              totalProjects: projects.length,
              activeApplications: totalApplicants,
              avgMatch: 98,
            }}
          />
        </div>

        <div className="mx-auto max-w-7xl space-y-8 px-2 sm:px-4">

          {/* Quick Metrics: Proyek Aktif, Total Pelamar, Proyek Selesai */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Card className="border-[#e8d5d0] bg-white shadow-2xs">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-xs font-medium text-[#8a7668]">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  Proyek Aktif (Open)
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-emerald-600">
                  {totalOpen}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#8a7668]">
                Sedang aktif membuka lamaran
              </CardContent>
            </Card>

            <Card className="border-[#e8d5d0] bg-white shadow-2xs">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-xs font-medium text-[#8a7668]">
                  <Users className="h-3.5 w-3.5 text-[#C98B75]" />
                  Total Pelamar
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-[#b87a65]">
                  {totalApplicants}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#8a7668]">
                Lamaran siap dievaluasi & diranking AI
              </CardContent>
            </Card>

            <Card className="border-[#e8d5d0] bg-white shadow-2xs">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-xs font-medium text-[#8a7668]">
                  <FolderCheck className="h-3.5 w-3.5 text-blue-600" />
                  Proyek Selesai
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-[#4a3728]">
                  {totalCompleted}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#8a7668]">
                Telah rampung dikerjakan
              </CardContent>
            </Card>

            <Card className="border-[#e8d5d0] bg-white shadow-2xs">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-xs font-medium text-[#8a7668]">
                  <Briefcase className="h-3.5 w-3.5 text-[#a89080]" />
                  Total Proyek
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-[#4a3728]">
                  {projects.length}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#8a7668]">
                Semua proyek yang pernah dibuat
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#4a3728] tracking-tight">
                  Daftar Proyek Organisasi
                </h2>
                <p className="text-xs text-[#8a7668]">
                  Kelola status, pantau pelamar, dan perbarui detail proyek dalam satu tempat.
                </p>
              </div>
              <span className="w-fit rounded-full border border-[#e8d5d0] bg-white px-3 py-1 text-xs font-semibold text-[#7a6559]">
                {projects.length} proyek
              </span>
            </div>

            <VendorProjectsList initialProjects={projects} />
          </div>
        </div>
      </main>
    </div>
  );
}
