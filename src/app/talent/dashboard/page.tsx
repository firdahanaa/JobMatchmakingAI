import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Sparkles,
  Search,
  User,
  ArrowRight,
  BookOpen,
  Building2,
  ChevronRight,
  Briefcase,
  FolderCheck,
  Star,
  AlertCircle,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MatchScoreBadge } from "@/components/talent/match-score-badge";
import { getTalentProjects } from "@/app/talent/projects/actions";
import { createClient } from "@/lib/supabase/server";

export default async function TalentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Ambil data proyek terekomendasi (terurut Match Score AI)
  const {
    projects,
    hasConfiguredSkills,
  } = await getTalentProjects({ sort: "match" });

  const recommendedProjects = projects.slice(0, 5);

  // 2. Ambil metrik ringkasan aplikasi pelamar
  const { data: applicationsData } = await supabase
    .from("applications")
    .select("status")
    .eq("talent_id", user.id);

  const apps = applicationsData || [];
  const activeApplicationsCount = apps.filter((a) => a.status === "pending" || a.status === "accepted").length;
  const completedProjectsCount = apps.filter((a) => a.status === "completed").length;

  // 3. Ambil data rating
  const { data: ratingData } = await supabase
    .from("talent_ratings")
    .select("avg_rating, review_count")
    .eq("talent_id", user.id)
    .maybeSingle();

  const avgRating = ratingData?.avg_rating != null ? Number(ratingData.avg_rating) : null;
  const reviewCount = ratingData?.review_count || 0;

  // 4. Ambil nama talent
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const talentName = profile?.full_name || user.user_metadata?.full_name || "Talenta Muda";

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
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Halo, {talentName}!
                </h1>
                <p className="text-sm text-purple-100 max-w-xl leading-relaxed">
                  Temukan proyek yang paling cocok dengan keahlianmu. AI Matchmaking siap menghubungkanmu dengan peluang terbaik.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Link href="/talent/projects">
                  <Button variant="secondary" className="gap-2 bg-white text-purple-700 hover:bg-purple-50 shadow-none font-semibold text-xs">
                    <Search className="h-4 w-4" />
                    Jelajahi Proyek
                  </Button>
                </Link>
                <Link href="/talent/profile">
                  <Button variant="outline" className="border-white/40 text-white hover:bg-white/10 hover:text-white text-xs font-semibold">
                    <User className="h-4 w-4 mr-1.5" />
                    Edit Profil & Skill
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-medium text-slate-500">
                    Lamaran Aktif
                  </CardDescription>
                  <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                    <Briefcase className="h-4 w-4" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {activeApplicationsCount}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                {activeApplicationsCount > 0
                  ? "Proyek yang sedang dalam proses review vendor"
                  : "Belum ada lamaran proyek aktif"}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-medium text-slate-500">
                    Proyek Selesai
                  </CardDescription>
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <FolderCheck className="h-4 w-4" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {completedProjectsCount}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                {reviewCount} ulasan terverifikasi dari vendor
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-medium text-slate-500">
                    Skor Rating Rata-rata
                  </CardDescription>
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                    <Star className="h-4 w-4" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {avgRating !== null ? `${avgRating.toFixed(1)} / 5.0` : "3.0 / 5.0"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                {avgRating !== null
                  ? "Berdasarkan ulasan vendor pada proyek terselesaikan"
                  : "Skor awal netral 60% (cold-start) untuk profil baru"}
              </CardContent>
            </Card>
          </div>

          {/* Warning Banner if skills are empty */}
          {!hasConfiguredSkills && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-900">
                      Profil Keahlian Belum Diisi
                    </h3>
                    <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                      Lengkapi keahlianmu di halaman profil agar AI dapat memberikan rekomendasi proyek dengan Match Score yang akurat.
                    </p>
                  </div>
                </div>
                <Link href="/talent/profile" className="shrink-0">
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5"
                  >
                    <span>Lengkapi Keahlian</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Section: Recommended for You (5 project teratas) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Recommended for You
                  </h2>
                  <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 text-2xs font-semibold">
                    Top 5 Match
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Proyek dengan tingkat kecocokan tertinggi berdasarkan kalkulasi mesin AI
                </p>
              </div>
              <Link href="/talent/projects">
                <Button variant="ghost" size="sm" className="gap-1 text-purple-700 hover:text-purple-800 hover:bg-purple-50 text-xs font-semibold">
                  <span>Lihat Semua Proyek</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {/* List of Recommended Cards (Mockup Style: judul, tag di kiri, persen match di kanan) */}
            {recommendedProjects.length > 0 ? (
              <div className="space-y-3">
                {recommendedProjects.map((project) => {
                  const formattedReward =
                    project.rewardAmount && project.rewardAmount > 0
                      ? new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        }).format(project.rewardAmount)
                      : project.type === "volunteer"
                      ? "Sukarela"
                      : "Sesuai Kesepakatan";

                  return (
                    <Link
                      key={project.id}
                      href={`/talent/projects/${project.id}`}
                      className="block group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 hover:shadow-md transition-all duration-200">
                        {/* Left Side: Title, Organization, & Tags */}
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-2xs font-medium text-slate-500">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {project.vendor?.organizationName || "Organisasi Vendor"}
                            </span>
                            {project.durationWeeks && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span>{project.durationWeeks} minggu</span>
                              </>
                            )}
                            <span className="text-slate-300">•</span>
                            <span className="text-purple-700 font-semibold">{formattedReward}</span>
                          </div>

                          <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition-colors truncate">
                            {project.title}
                          </h3>

                          {/* Tags: Difficulty, Type, Mode, Top Skills */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <Badge variant="secondary" className="text-3xs capitalize font-medium">
                              {project.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-3xs capitalize font-medium">
                              {project.type}
                            </Badge>
                            <span className="px-2 py-0.5 rounded-full text-3xs font-medium bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                              {project.mode}
                            </span>
                            {project.skills.slice(0, 3).map((s) => (
                              <span
                                key={s.skillId}
                                className={`px-2 py-0.5 rounded-md text-3xs font-medium ${
                                  s.talentStatus.isAdequate
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-50 text-slate-600 border border-slate-200"
                                }`}
                              >
                                {s.name}
                              </span>
                            ))}
                            {project.skills.length > 3 && (
                              <span className="text-3xs text-slate-400">
                                +{project.skills.length - 3} lainnya
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Side: Persen Match Badge & Action Arrow */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <MatchScoreBadge score={project.matchResult.score} size="md" />
                          <div className="h-8 w-8 rounded-full bg-slate-50 group-hover:bg-purple-100/70 flex items-center justify-center text-slate-400 group-hover:text-purple-700 transition-colors">
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              /* Empty state jika belum ada proyek */
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">
                  Belum Ada Proyek Terbuka
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Belum ada proyek berstatus terbuka saat ini. Periksa kembali secara berkala untuk melihat proyek baru dari mitra vendor.
                </p>
                <div className="pt-2">
                  <Link href="/talent/projects">
                    <Button variant="outline" size="sm" className="text-xs">
                      Cek Halaman Proyek
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
