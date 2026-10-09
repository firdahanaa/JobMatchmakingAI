import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  Sparkles,
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
  Clock,
  Target,
  Flame,
  BarChart3,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchScoreBadge } from "@/components/talent/match-score-badge";
import { StarRating } from "@/components/ui/star-rating";
import { getTalentProjects } from "@/app/talent/projects/actions";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { FuturisticHeroDashboard } from "@/components/futuristic-hero";
import { AILiveTicker, ProjectFilterBar } from "@/components/talent/interactive-dashboard-widgets";

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
  const activeApplicationsCount = apps.filter((a: { status: string }) => a.status === "pending" || a.status === "accepted").length;
  const completedProjectsCount = apps.filter((a: { status: string }) => a.status === "completed").length;

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

  const topRecommendedProject = recommendedProjects[0] ? {
    id: recommendedProjects[0].id,
    title: recommendedProjects[0].title,
    orgName: recommendedProjects[0].vendor?.organizationName || "Vendor Terverifikasi",
    location: `${recommendedProjects[0].vendor?.location || "Bandung"} (${recommendedProjects[0].mode === "remote" ? "Remote" : "Onsite"})`,
    stipend: recommendedProjects[0].type === "freelance" 
      ? `Rp ${recommendedProjects[0].rewardAmount?.toLocaleString("id-ID")}`
      : "Sertifikat & Portofolio",
    duration: `${recommendedProjects[0].durationWeeks || 4} Minggu (${recommendedProjects[0].hoursPerWeek || 15} jam/mgg)`,
    matchScore: recommendedProjects[0].matchResult?.score || 92,
    description: recommendedProjects[0].description,
    workMode: recommendedProjects[0].mode,
  } : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F0F9FF] text-[#0F172A]">
      <main className="flex-1 px-1 sm:px-3 lg:px-6">
        {/* Hero — zero padding, fills full width */}
        <div className="w-full pt-2 sm:pt-6">
          <FuturisticHeroDashboard
            userRole="talent"
            topProject={topRecommendedProject}
            stats={{
              totalProjects: projects.length || 1240,
              activeApplications: activeApplicationsCount,
              avgMatch: 94,
            }}
          />
        </div>

        {/* Body sections — sit on the page gradient, no separate bg divs */}
        <div className="mx-auto max-w-7xl px-3 sm:px-6 pt-8 pb-16 space-y-10">

            {/* ── AI LIVE TICKER — dark glass style ── */}
            <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-white px-5 py-3 shadow-md shadow-sky-100/50">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-[#0F172A] shadow-md">
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-sky-400" />
                </span>
                <Zap className="h-4 w-4" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-6 text-xs font-bold text-[#0F172A] whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                    <span className="text-sky-600">AI Match Engine:</span> 1,240 Proyek Di-scan Realtime
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-sky-300" />
                    <span className="text-sky-200">Match Puncak:</span> 95% Cocok untuk Profilmu
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="hidden sm:inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-slate-600">3 Vendor Terverifikasi Meninjau Talenta Minggu Ini</span>
                  </span>
                </div>
              </div>
              <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-sky-400/20 border border-[#E0E081]/40 px-3 py-1 text-3xs font-extrabold text-sky-600 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                LIVE
              </span>
            </div>

            {/* ── QUICK METRICS CARDS — Glass dark style matching hero ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

              {/* Card 1: Jumlah Lamaran */}
              <div className="group relative overflow-hidden rounded-3xl rounded-3xl border border-sky-100 bg-white p-6 shadow-md shadow-sky-100/50 hover:shadow-xl hover:shadow-sky-200/50 transition-all duration-300">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#C98B75]/20 blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-3xs font-extrabold uppercase tracking-[0.2em] text-slate-500">Jumlah Lamaran</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-[#0F172A] shadow-lg shadow-[#C98B75]/30 group-hover:scale-110 transition-transform duration-300">
                    <Briefcase className="h-5 w-5" />
                  </div>
                </div>
                <div className="relative z-10 mt-5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-[#0F172A] tracking-tight tabular-nums">
                      {totalApplicationsCount}
                    </span>
                    <span className="text-sm font-semibold text-slate-500 mb-1">Proyek</span>
                  </div>
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-sky-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-1000"
                      style={{ width: `${Math.min(100, (totalApplicationsCount / 20) * 100) || 10}%` }}
                    />
                  </div>
                </div>
                <div className="relative z-10 mt-4">
                  {activeApplicationsCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-[#0F172A]">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                      {activeApplicationsCount} aktif diproses
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Semua riwayat lamaran proyekmu</span>
                  )}
                </div>
              </div>

              {/* Card 2: Proyek Selesai */}
              <div className="group relative overflow-hidden rounded-3xl rounded-3xl border border-sky-100 bg-white p-6 shadow-md shadow-sky-100/50 hover:shadow-xl hover:shadow-sky-200/50 transition-all duration-300">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-300/20 blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-3xs font-extrabold uppercase tracking-[0.2em] text-slate-500">Proyek Selesai</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform duration-300">
                    <FolderCheck className="h-5 w-5" />
                  </div>
                </div>
                <div className="relative z-10 mt-5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-[#0F172A] tracking-tight tabular-nums">
                      {completedProjectsCount}
                    </span>
                    <span className="text-sm font-semibold text-slate-500 mb-1">Selesai</span>
                  </div>
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-sky-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-1000"
                      style={{ width: `${Math.min(100, (completedProjectsCount / 10) * 100) || 10}%` }}
                    />
                  </div>
                </div>
                <div className="relative z-10 mt-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {reviewCount} ulasan terverifikasi
                  </span>
                </div>
              </div>

              {/* Card 3: Rating — White cutout style (like hero bottom-left card) */}
              <div className="group relative overflow-hidden rounded-3xl bg-white border border-sky-100 p-6 shadow-md shadow-sky-100/50 hover:shadow-xl hover:shadow-sky-200/50 transition-all duration-300 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-3xl">
                <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-gradient-to-br from-slate-300/40 via-slate-200/25 to-transparent blur-xl transition-all duration-500 group-hover:scale-125 pointer-events-none" />
                <Star className="absolute bottom-4 right-4 h-16 w-16 text-slate-100/80 group-hover:text-slate-200 group-hover:rotate-12 transition-all duration-500" style={{ fill: "currentColor" }} />
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-3xs font-extrabold uppercase tracking-[0.2em] text-slate-500">Rating Rata-rata</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-lg shadow-slate-500/20 group-hover:scale-110 transition-transform duration-300">
                    <Star className="h-5 w-5 fill-white" />
                  </div>
                </div>
                <div className="relative z-10 mt-5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-[#0F172A] tracking-tight tabular-nums">
                      {avgRating !== null ? avgRating.toFixed(1) : "5.0"}
                    </span>
                    <span className="text-sm font-semibold text-slate-500 mb-1">/ 5.0</span>
                  </div>
                  <div className="mt-2">
                    <StarRating value={avgRating ?? 5.0} readOnly size="sm" />
                  </div>
                </div>
                <div className="relative z-10 mt-3 text-xs text-slate-500">
                  {avgRating !== null ? `${reviewCount} ulasan vendor` : "Cold-start 60% profil baru"}
                </div>
              </div>
            </div>

            {/* ── WARNING BANNER ── */}
            {!hasConfiguredSkills && (
              <div className="relative overflow-hidden rounded-3xl border border-sky-200/80 bg-white/70 backdrop-blur-xl p-6 shadow-lg shadow-slate-400/10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-sky-100 text-sky-800 shadow-sm shrink-0">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-[#0F172A]">Profil Keahlian Belum Diisi</h3>
                      <p className="text-xs text-[#0F172A]/70 mt-1 leading-relaxed max-w-xl">
                        Lengkapi keahlianmu di halaman profil agar AI dapat memberikan rekomendasi proyek dengan Match Score yang akurat.
                      </p>
                    </div>
                  </div>
                  <Link href="/talent/profile" className="shrink-0 w-full sm:w-auto">
                    <Button className="w-full sm:w-auto rounded-full bg-[#f5f0ec] text-slate-800 hover:bg-white font-bold text-xs h-10 px-5 gap-2 shadow-sm">
                      <span>Lengkapi Keahlian</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* ── MAIN GRID ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* LEFT 2-COL: Recommended + Ulasan */}
              <div className="lg:col-span-2 space-y-8">

                {/* ── RECOMMENDED FOR YOU ── */}
                <div className="space-y-5">
                  {/* Section Header — white squircle card matching hero bottom-left style */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border border-sky-100 bg-white p-5 shadow-md shadow-sky-100/40 rounded-3xl">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-lg font-black text-[#0F172A] tracking-tight">Recommended for You</h2>
                          <span className="rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-3 py-0.5 text-3xs font-extrabold text-white shadow-sm">
                            Top 5 Match
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Proyek AI dengan kecocokan tertinggi</p>
                      </div>
                    </div>
                    <Link href="/talent/projects">
                      <button type="button" className="flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-4 py-2 text-xs font-bold text-sky-800 hover:bg-sky-700 hover:text-white hover:border-sky-700 transition-all duration-300 group">
                        Lihat Semua
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </Link>
                  </div>

                  {/* Project cards */}
                  {recommendedProjects.length > 0 ? (
                    <div className="space-y-4">
                      {recommendedProjects.map((project) => {
                        const formattedReward =
                          project.rewardAmount && project.rewardAmount > 0
                            ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(project.rewardAmount)
                            : project.type === "volunteer" ? "Sukarela" : "Sesuai Kesepakatan";
                        return (
                          <Link key={project.id} href={`/talent/projects/${project.id}`} className="block group">
                            {/* White squircle card — exactly like hero bottom-left */}
                            <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white p-5 sm:p-6 shadow-md transition-all duration-400 hover:-translate-y-1 hover:shadow-xl hover:border-[#C98B75]/40 group-hover:shadow-[#C98B75]/10">
                              {/* Subtle glow on hover */}
                              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-[#C98B75]/10 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                                <div className="space-y-3 flex-1 min-w-0">
                                  {/* Meta pills row */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-100 px-3 py-1 text-xs font-extrabold text-slate-600">
                                      <Building2 className="h-3.5 w-3.5 text-sky-600" />
                                      <span className="truncate max-w-[160px]">{project.vendor?.organizationName || "Organisasi Vendor"}</span>
                                    </span>
                                    {project.durationWeeks && (
                                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 border border-sky-100 px-3 py-1 text-xs font-bold text-slate-600">
                                        <Clock className="h-3.5 w-3.5 text-[#D4B980]" />
                                        {project.durationWeeks} minggu
                                      </span>
                                    )}
                                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-extrabold text-sky-800">
                                      {formattedReward}
                                    </span>
                                  </div>

                                  {/* Title */}
                                  <h3 className="text-base sm:text-lg font-black text-[#0F172A] group-hover:text-sky-600 transition-colors leading-snug">
                                    {project.title}
                                  </h3>

                                  {/* Skill tags */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-sky-50 border border-sky-100 px-3 py-1 text-xs font-bold capitalize text-sky-600">{project.difficulty}</span>
                                    <span className="rounded-full bg-sky-100 border border-sky-100 px-3 py-1 text-xs font-bold capitalize text-slate-600">{project.mode}</span>
                                    {project.skills.slice(0, 3).map((s) => (
                                      <span
                                        key={s.skillId}
                                        className={`rounded-full border px-3 py-1 text-xs font-bold ${
                                          s.talentStatus.isAdequate
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                            : "bg-sky-50/60 border-sky-100 text-slate-600"
                                        }`}
                                      >
                                        {s.name}
                                      </span>
                                    ))}
                                    {project.skills.length > 3 && (
                                      <span className="text-xs text-[#a89080] font-bold">+{project.skills.length - 3}</span>
                                    )}
                                  </div>
                                </div>

                                {/* Match score + arrow */}
                                <div className="flex items-center justify-between md:flex-col md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-[#F7ECEA] shrink-0">
                                  <MatchScoreBadge score={project.matchResult.score} size="lg" />
                                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 group-hover:bg-sky-700 text-sky-800 group-hover:text-white shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-45">
                                    <ArrowRight className="h-5 w-5" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-sky-200 bg-white p-12 text-center space-y-4 shadow-sm">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-50 text-sky-600">
                        <BookOpen className="h-7 w-7" />
                      </div>
                      <h3 className="font-black text-[#0F172A] text-base">Belum Ada Proyek Terbuka</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        Belum ada proyek berstatus terbuka. Periksa berkala untuk melihat peluang baru.
                      </p>
                    </div>
                  )}
                </div>

                {/* ── ULASAN & REPUTASI ── */}
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border border-sky-100 bg-white p-5 shadow-md shadow-sky-100/40 rounded-3xl">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-md shadow-slate-500/20">
                        <Star className="h-6 w-6 fill-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-lg font-black text-[#0F172A] tracking-tight">Ulasan & Reputasi</h2>
                          <span className="rounded-full bg-amber-100 border border-amber-200 px-3 py-0.5 text-3xs font-extrabold text-amber-800">
                            {reviewCount} Ulasan
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Feedback performa dari vendor</p>
                      </div>
                    </div>
                    <Link href="/talent/profile">
                      <button type="button" className="flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-4 py-2 text-xs font-bold text-sky-800 hover:bg-sky-700 hover:text-white hover:border-sky-700 transition-all duration-300 group">
                        Lihat di Profil
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </Link>
                  </div>

                  {recentReviews.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recentReviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="relative overflow-hidden rounded-3xl border border border-sky-100 bg-white p-5 shadow-md shadow-sky-100/40 rounded-3xl hover:border-[#C98B75]/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between space-y-4"
                        >
                          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-100/40 blur-xl pointer-events-none" />
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3 border-b border-[#F7ECEA] pb-3">
                              <div>
                                <p className="text-sm font-black text-[#0F172A] flex items-center gap-1.5">
                                  <Building2 className="h-4 w-4 text-sky-600 shrink-0" />
                                  <span className="truncate max-w-[150px]">{rev.vendorName}</span>
                                </p>
                                <p className="text-xs text-slate-500 truncate max-w-[160px] mt-0.5">{rev.projectTitle}</p>
                              </div>
                              <StarRating value={rev.rating} readOnly size="sm" showValue />
                            </div>
                            {rev.comment ? (
                              <div className="rounded-2xl bg-sky-50/60 border border-[#F7ECEA] p-3.5 text-xs text-slate-600 italic leading-relaxed">
                                &ldquo;{rev.comment}&rdquo;
                              </div>
                            ) : (
                              <p className="text-xs text-[#a89080] italic">(Tanpa komentar tertulis)</p>
                            )}
                          </div>
                          <div className="pt-2 border-t border-[#F7ECEA] text-3xs text-slate-500 flex items-center justify-between font-medium">
                            <span>Diterima:</span>
                            <span className="font-extrabold text-slate-600">
                              {new Date(rev.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-sky-200 bg-white p-8 text-center space-y-3 shadow-sm">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 shadow-sm">
                        <Star className="h-6 w-6 fill-slate-400 text-slate-500" />
                      </div>
                      <p className="text-sm font-black text-[#0F172A]">Belum Ada Ulasan</p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">Selesaikan proyek untuk mengumpulkan ulasan dari vendor.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COL: Skill Progress + Skill Gap */}
              <div className="space-y-6">

                {/* ── SKILL PROGRESS ── */}
                <div className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-md">
                  {/* Glass header band */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] p-5 border-b border-sky-100">
                    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-sky-300/20 blur-2xl animate-pulse-glow pointer-events-none" />
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full border-2 border-dashed border-sky-300/60 animate-spin-slow" />
                          <div className="relative h-7 w-7 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                            <TrendingUp className="h-4 w-4" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-[#0F172A]">Skill Progress</h3>
                          <p className="text-3xs text-slate-500">Kemahiran tercatat di profil</p>
                        </div>
                      </div>
                      <Link href="/talent/profile">
                        <button type="button" className="flex items-center gap-1 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-3xs font-extrabold text-sky-700 hover:bg-sky-50 transition-all">
                          Kelola
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </Link>
                    </div>
                  </div>

                  {/* White body */}
                  <div className="p-5 space-y-4">
                    {talentSkills.length > 0 ? (
                      <div className="space-y-4">
                        {talentSkills.map((s, idx) => {
                          const palette = [
                            { bar: "from-sky-500 via-sky-400 to-blue-500", badge: "bg-gradient-to-r from-sky-600 to-blue-700 text-white", dot: "bg-sky-600" },
                            { bar: "from-sky-400 to-blue-500", badge: "bg-sky-100 text-sky-800 border border-sky-200", dot: "bg-sky-500" },
                            { bar: "from-sky-300 to-blue-400", badge: "bg-sky-50 text-slate-600 border border-sky-100", dot: "bg-sky-400" },
                          ];
                          const p = palette[idx % palette.length];
                          return (
                            <div key={s.skillId}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`h-2 w-2 rounded-full ${p.dot} shrink-0`} />
                                  <span className="text-xs font-extrabold text-[#0F172A] truncate max-w-[130px]">{s.name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`px-2 py-0.5 rounded-full text-3xs font-extrabold uppercase ${p.badge}`}>{s.level}</span>
                                  <span className="text-xs font-black text-sky-600 tabular-nums w-8 text-right">{s.progressPercent}%</span>
                                </div>
                              </div>
                              {/* Segmented pill bar — 10 segments */}
                              <div className="flex gap-0.5">
                                {Array.from({ length: 10 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={`h-2.5 flex-1 rounded-full transition-all duration-700 ${
                                      (i + 1) * 10 <= s.progressPercent
                                        ? `bg-gradient-to-r ${p.bar}`
                                        : "bg-sky-50"
                                    }`}
                                    style={{ transitionDelay: `${i * 60}ms` }}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-3 border-t border-[#F7ECEA] flex items-center justify-between text-3xs text-slate-500 font-semibold">
                          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#C98B75]/60" />Beginner</span>
                          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#D4B980]" />Intermediate</span>
                          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-sky-400" />Advanced</span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-sky-100 p-6 text-center space-y-3">
                        <Award className="h-8 w-8 text-[#a89080] mx-auto" />
                        <p className="text-xs font-extrabold text-[#0F172A]">Belum ada skill</p>
                        <Link href="/talent/profile">
                          <Button size="sm" variant="outline" className="text-xs h-8 mt-1 rounded-xl">Tambah Skill</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── SKILL GAP ── */}
                <div className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-md">
                  {/* Glass header */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] p-5 border-b border-sky-100">
                    <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-blue-300/20 blur-2xl animate-pulse-glow pointer-events-none" />
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-300/30">
                          <Zap className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-[#0F172A]">Skill Gap Teratas</h3>
                          <p className="text-3xs text-slate-500">Paling dicari proyek terbuka</p>
                        </div>
                      </div>
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-3xs font-extrabold text-sky-700">
                        {topSkillGaps.length} Gap
                      </span>
                    </div>
                  </div>

                  {/* White body */}
                  <div className="p-5">
                    {topSkillGaps.length > 0 ? (
                      <div className="space-y-3">
                        {topSkillGaps.map((gap, index) => {
                          const rank = [
                            { bg: "from-sky-500 to-blue-600", text: "text-sky-600", bar: "w-full", light: "bg-sky-50" },
                            { bg: "from-[#D4B980] to-[#E0E081]", text: "text-[#9c824a]", bar: "w-3/4", light: "bg-sky-100" },
                            { bg: "from-[#e0c4bc] to-[#d4b0a5]", text: "text-slate-500", bar: "w-1/2", light: "bg-sky-50/60" },
                          ][index] ?? { bg: "from-[#e0c4bc] to-[#d4b0a5]", text: "text-slate-500", bar: "w-1/2", light: "bg-sky-50/60" };
                          return (
                            <div key={gap.name} className="group relative overflow-hidden rounded-2xl border border-sky-100 p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:border-[#C98B75]/40">
                              <div className={`absolute inset-0 ${rank.light} opacity-40`} />
                              <div className={`absolute bottom-0 left-0 h-0.5 ${rank.bar} bg-gradient-to-r ${rank.bg} opacity-70 group-hover:opacity-100 transition-opacity`} />
                              <div className="relative flex items-center gap-3">
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${rank.bg} text-[#0F172A] text-xs font-black shadow-sm`}>
                                  {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className={`text-sm font-extrabold ${rank.text} block truncate group-hover:text-sky-600 transition-colors`}>{gap.name}</span>
                                  <span className="text-3xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    <ArrowRight className="h-3 w-3 text-sky-600 group-hover:translate-x-0.5 transition-transform" />
                                    Pelajari untuk buka lebih banyak proyek
                                  </span>
                                </div>
                                <span className={`shrink-0 rounded-full bg-gradient-to-r ${rank.bg} text-[#0F172A] px-2.5 py-0.5 text-3xs font-extrabold`}>{gap.count}×</span>
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-1">
                          <Link href="/talent/projects">
                            <button type="button" className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-extrabold text-xs h-11 px-5 gap-2 shadow-lg shadow-sky-300/40 hover:from-sky-600 hover:to-blue-700 transition-all duration-300 flex items-center justify-center group">
                              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                              <Flame className="h-4 w-4" />
                              <span>Cek Proyek yang Membutuhkan</span>
                              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-center space-y-2">
                        <CheckCircle2 className="h-7 w-7 text-emerald-600 mx-auto" />
                        <p className="text-sm font-extrabold text-emerald-950">Tidak Ada Skill Gap!</p>
                        <p className="text-xs text-emerald-800 leading-relaxed">Keahlianmu mencakup semua skill proyek terbuka.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
