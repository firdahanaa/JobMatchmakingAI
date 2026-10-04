import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
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
  TrendingUp,
  Zap,
  CheckCircle2,
  Award,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MatchScoreBadge } from "@/components/talent/match-score-badge";
import { StarRating } from "@/components/ui/star-rating";
import { getTalentProjects } from "@/app/talent/projects/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard Talenta",
  description: "Rekomendasi proyek berbasis AI, progres keahlian, dan analisis skill gap.",
};

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
  const totalApplicationsCount = apps.length;
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

  // 4. Ambil review terbaru yang diterima talenta
  const { data: recentReviewsData } = await supabase
    .from("reviews")
    .select(`
      id,
      rating,
      comment,
      created_at,
      vendor_profiles:vendor_id (
        organization_name
      ),
      applications:application_id (
        projects:project_id (
          title
        )
      )
    `)
    .eq("talent_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  type RawRecentReview = {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    vendor_profiles?: { organization_name: string } | { organization_name: string }[] | null;
    applications?: { projects?: { title: string } | { title: string }[] | null } | { projects?: { title: string } | { title: string }[] | null }[] | null;
  };

  const recentReviews = ((recentReviewsData || []) as unknown as RawRecentReview[]).map((r) => {
    const vObj = Array.isArray(r.vendor_profiles) ? r.vendor_profiles[0] : r.vendor_profiles;
    const aObj = Array.isArray(r.applications) ? r.applications[0] : r.applications;
    const pObj = Array.isArray(aObj?.projects) ? aObj?.projects[0] : aObj?.projects;
    return {
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
      vendorName: vObj?.organization_name || "Organisasi Vendor",
      projectTitle: pObj?.title || "Proyek",
    };
  });

  // 5. Ambil data profil talent
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const talentName = profile?.full_name || user.user_metadata?.full_name || "Talenta Muda";

  // 6. Ambil data skill talent untuk "Skill Progress"
  const { data: talentSkillsData } = await supabase
    .from("talent_skills")
    .select("skill_id, level, skills(id, name, category)")
    .eq("talent_id", user.id);

  type RawTalentSkill = {
    skill_id: number;
    level: "beginner" | "intermediate" | "advanced";
    skills: { id: number; name: string; category: string } | { id: number; name: string; category: string }[];
  };

  const talentSkills = ((talentSkillsData || []) as unknown as RawTalentSkill[]).map((ts) => {
    const sObj = Array.isArray(ts.skills) ? ts.skills[0] : ts.skills;
    const level = ts.level;
    const progressPercent = level === "advanced" ? 100 : level === "intermediate" ? 66 : 33;
    return {
      skillId: ts.skill_id,
      name: sObj?.name || `Skill #${ts.skill_id}`,
      category: sObj?.category || "Lainnya",
      level,
      progressPercent,
    };
  });

  // 7. Agregasi "Skill Gap Teratas" dari proyek-proyek terbuka
  // Menghitung seberapa sering tiap skill yang kurang muncul pada seluruh proyek terbuka
  const missingSkillFrequency: Record<string, { count: number; name: string }> = {};
  for (const proj of projects) {
    if (proj.matchResult?.missingSkills) {
      for (const missingName of proj.matchResult.missingSkills) {
        if (!missingSkillFrequency[missingName]) {
          missingSkillFrequency[missingName] = { count: 0, name: missingName };
        }
        missingSkillFrequency[missingName].count += 1;
      }
    }
  }

  const topSkillGaps = Object.values(missingSkillFrequency)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

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

          {/* Quick Metrics: Ringkasan Jumlah Lamaran, Proyek Selesai, Rating Rata-rata */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-medium text-slate-500">
                    Jumlah Lamaran
                  </CardDescription>
                  <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                    <Briefcase className="h-4 w-4" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {totalApplicationsCount}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                {activeApplicationsCount > 0 ? (
                  <span className="text-purple-700 font-medium">
                    {activeApplicationsCount} lamaran sedang aktif diproses
                  </span>
                ) : (
                  "Semua riwayat lamaran proyekmu"
                )}
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
                    Rating Rata-rata
                  </CardDescription>
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                    <Star className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl font-bold text-slate-900">
                    {avgRating !== null ? `${avgRating.toFixed(1)} / 5.0` : "Belum Ada"}
                  </CardTitle>
                </div>
                <div className="pt-1">
                  <StarRating value={avgRating ?? 0} readOnly size="sm" />
                </div>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                {avgRating !== null
                  ? `Berdasarkan ${reviewCount} ulasan vendor pada proyek terselesaikan`
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

          {/* Main Grid: Recommended Projects (Left) & Skills / Gaps (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Columns: Recommended for You */}
            <div className="lg:col-span-2 space-y-6">
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
                      Proyek dengan tingkat kecocokan tertinggi berdasarkan kalkulasi AI
                    </p>
                  </div>
                  <Link href="/talent/projects">
                    <Button variant="ghost" size="sm" className="gap-1 text-purple-700 hover:text-purple-800 hover:bg-purple-50 text-xs font-semibold">
                      <span>Lihat Semua</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>

                {/* List of Recommended Cards */}
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
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm">
                      Belum Ada Proyek Terbuka
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Belum ada proyek berstatus terbuka saat ini. Periksa kembali secara berkala untuk melihat peluang baru.
                    </p>
                  </div>
                )}
              </div>

              {/* Section: Ulasan Terbaru Vendor */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                        Ulasan & Reputasi
                      </h2>
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800 text-2xs font-semibold">
                        {reviewCount} Ulasan
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Feedback performa dari vendor setelah proyek diselesaikan
                    </p>
                  </div>

                  <Link href="/talent/profile">
                    <Button variant="ghost" size="sm" className="text-xs text-purple-700 hover:text-purple-800 gap-1">
                      <span>Lihat di Profil</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>

                {recentReviews.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {recentReviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                <span className="truncate max-w-[150px]">{rev.vendorName}</span>
                              </p>
                              <p className="text-3xs text-slate-500 truncate max-w-[160px]">
                                {rev.projectTitle}
                              </p>
                            </div>
                            <StarRating value={rev.rating} readOnly size="sm" showValue />
                          </div>

                          {rev.comment ? (
                            <p className="text-xs text-slate-700 italic line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              &ldquo;{rev.comment}&rdquo;
                            </p>
                          ) : (
                            <p className="text-2xs text-slate-400 italic">
                              (Tanpa komentar tertulis)
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 text-3xs text-slate-400 flex items-center justify-between">
                          <span>Diterima:</span>
                          <span>
                            {new Date(rev.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center space-y-2">
                    <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">Belum Ada Ulasan Diterima</p>
                    <p className="text-2xs text-slate-500 max-w-sm mx-auto">
                      Selesaikan proyek pertamamu untuk mulai mengumpulkan ulasan dan reputasi bintang dari vendor.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Skill Progress & Skill Gap Teratas */}
            <div className="space-y-6">
              {/* Card 1: Skill Progress */}
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        Skill Progress
                      </CardTitle>
                    </div>
                    <Link href="/talent/profile">
                      <Button variant="ghost" size="sm" className="h-7 text-3xs text-purple-700 font-semibold px-2">
                        Kelola
                      </Button>
                    </Link>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Tingkat kemahiran keahlian yang tercatat di profilmu
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {talentSkills.length > 0 ? (
                    <div className="space-y-3.5">
                      {talentSkills.map((s) => {
                        const levelBadgeColor =
                          s.level === "advanced"
                            ? "bg-purple-100 text-purple-800 border-purple-200"
                            : s.level === "intermediate"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : "bg-slate-100 text-slate-700 border-slate-200";

                        const progressColor =
                          s.level === "advanced"
                            ? "bg-purple-600"
                            : s.level === "intermediate"
                            ? "bg-blue-600"
                            : "bg-slate-500";

                        return (
                          <div key={s.skillId} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800 truncate max-w-[170px]">
                                {s.name}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-3xs font-semibold uppercase border ${levelBadgeColor}`}>
                                  {s.level}
                                </span>
                                <span className="text-3xs text-slate-400 font-mono">
                                  {s.progressPercent}%
                                </span>
                              </div>
                            </div>
                            <Progress
                              value={s.progressPercent}
                              indicatorClassName={progressColor}
                              className="h-2 bg-slate-100"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center space-y-2">
                      <Award className="h-6 w-6 text-slate-400 mx-auto" />
                      <p className="text-xs font-medium text-slate-700">Belum ada skill ditambahkan</p>
                      <p className="text-3xs text-slate-400">Tambahkan skill di profil untuk melihat progres kemahiran.</p>
                      <Link href="/talent/profile">
                        <Button size="sm" variant="outline" className="text-xs h-7 mt-1">
                          Tambah Skill Sekarang
                        </Button>
                      </Link>
                    </div>
                  )}

                  {/* Level Legend */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      Beginner (33%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Intermediate (66%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                      Advanced (100%)
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Skill Gap Teratas */}
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        Skill Gap Teratas
                      </CardTitle>
                    </div>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Keahlian yang paling sering dicari pada proyek terbuka saat ini
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topSkillGaps.length > 0 ? (
                    <div className="space-y-2.5">
                      {topSkillGaps.map((gap, index) => (
                        <div
                          key={gap.name}
                          className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-3xs font-bold">
                                {index + 1}
                              </span>
                              {gap.name}
                            </span>
                            <Badge variant="outline" className="text-3xs bg-white text-slate-600 border-slate-200 font-medium">
                              {gap.count} proyek
                            </Badge>
                          </div>
                          <p className="text-3xs text-purple-700 font-medium flex items-center gap-1">
                            <ArrowRight className="h-3 w-3 shrink-0" />
                            <span>Pelajari ini untuk membuka lebih banyak project</span>
                          </p>
                        </div>
                      ))}

                      <div className="pt-2 text-center">
                        <Link href="/talent/projects">
                          <Button variant="outline" size="sm" className="w-full text-xs text-slate-700 h-8">
                            Cek Proyek yang Membutuhkan
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-4 text-center space-y-1.5">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                      <p className="text-xs font-bold text-emerald-900">
                        Tidak Ada Skill Gap!
                      </p>
                      <p className="text-3xs text-emerald-700 leading-relaxed">
                        Keahlianmu sudah mencakup semua syarat skill pada proyek-proyek terbuka saat ini.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
