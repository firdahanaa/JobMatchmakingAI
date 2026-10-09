import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Globe,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MatchScoreBadge } from "@/components/talent/match-score-badge";
import { MatchBreakdownPanel } from "@/components/talent/match-breakdown-panel";
import { ApplyDialog } from "@/components/talent/apply-dialog";
import { TalentPageNavigation } from "@/components/talent/talent-page-navigation";
import { getTalentProjectDetail } from "../actions";
import { getApplicationForProject } from "@/app/talent/applications/actions";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProjectDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const { project } = await getTalentProjectDetail(id);
  if (!project) {
    return { title: "Proyek Tidak Ditemukan" };
  }
  return {
    title: `${project.title} — Detail Proyek`,
    description: project.description.slice(0, 160),
  };
}

const difficultyLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" }> = {
  beginner: { label: "Pemula (Beginner)", variant: "secondary" },
  intermediate: { label: "Menengah (Intermediate)", variant: "warning" },
  advanced: { label: "Tingkat Lanjut (Advanced)", variant: "default" },
};

const typeLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "success" }> = {
  freelance: { label: "Freelance", variant: "default" },
  volunteer: { label: "Volunteer (Sukarela)", variant: "outline" },
};

const modeLabels: Record<string, { label: string; icon: string; desc: string }> = {
  remote: { label: "Remote (Kerja Online)", icon: "🌐", desc: "Dapat dikerjakan dari mana saja" },
  onsite: { label: "Onsite (Di Lokasi)", icon: "🏢", desc: "Perlu kehadiran fisik di kantor/lokasi" },
  hybrid: { label: "Hybrid", icon: "🔄", desc: "Kombinasi remote dan kehadiran di lokasi" },
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { project, error } = await getTalentProjectDetail(id);
  const { application: existingApplication } = await getApplicationForProject(id);

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F0F9FF] text-[#0F172A]">
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-3xl border border-sky-100 bg-white p-8 text-center space-y-4 shadow-xl shadow-sky-100/50">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-[#0F172A]">Proyek Tidak Ditemukan</h2>
            <p className="text-xs text-slate-500">
              {error || "Proyek mungkin sudah ditutup atau tidak tersedia lagi."}
            </p>
            <div className="pt-2">
              <Link href="/talent/projects">
                <Button className="gap-2 text-xs">
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Daftar Proyek
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const diffInfo = difficultyLabels[project.difficulty] || {
    label: project.difficulty,
    variant: "secondary" as const,
  };
  const typeInfo = typeLabels[project.type] || {
    label: project.type,
    variant: "default" as const,
  };
  const modeInfo = modeLabels[project.mode] || {
    label: project.mode,
    icon: "📌",
    desc: "",
  };

  const formattedReward =
    project.rewardAmount && project.rewardAmount > 0
      ? new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(project.rewardAmount)
      : project.type === "volunteer"
      ? "Sukarela (Volunteer)"
      : "Sesuai Kesepakatan";

  const formattedDeadline = project.deadline
    ? new Date(project.deadline).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Fleksibel / Belum Ditentukan";

  const formattedCreatedAt = new Date(project.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F0F9FF] text-[#0F172A]">
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Back Navigation Bar */}
          <div className="flex flex-col gap-3 rounded-3xl border border-sky-100 bg-white/90 p-3 shadow-md shadow-sky-100/50 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 sm:contents">
              <Link href="/talent/projects">
                <span className="group inline-flex min-h-11 min-w-28 items-center justify-center rounded-full bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-1.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:from-sky-700 hover:to-blue-700 hover:shadow-lg hover:shadow-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2">
                  <span>Kembali</span>
                </span>
              </Link>
              <div className="sm:order-2">
                <MatchScoreBadge score={project.matchResult.score} size="md" />
              </div>
            </div>
            <div className="flex justify-center rounded-2xl border border-sky-100 bg-sky-50/70 p-1.5 sm:order-1">
              <TalentPageNavigation activePage="projects" />
            </div>
          </div>

          {/* Main 2-Column Grid: Left (Project Info) & Right (Match Breakdown Panel) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column (8 cols): Project Details */}
            <div className="lg:col-span-7 space-y-6">
              {/* Project Header Card */}
              <Card className="border-sky-100 bg-white shadow-md shadow-sky-100/50">
                <CardHeader className="p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={diffInfo.variant} className="text-xs">
                        {diffInfo.label}
                      </Badge>
                      <Badge variant={typeInfo.variant} className="text-xs">
                        {typeInfo.label}
                      </Badge>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200">
                        <span>{modeInfo.icon}</span>
                        <span>{modeInfo.label}</span>
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Status: Open
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A] leading-tight">
                      {project.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Building2 className="h-4 w-4 text-sky-600" />
                        <span>{project.vendor?.organizationName || "Organisasi Vendor"}</span>
                      </div>
                      {project.vendor?.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-sky-600" />
                          <span>{project.vendor.location}</span>
                        </div>
                      )}
                      <div>Diposting: {formattedCreatedAt}</div>
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-sky-100">
                    <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100">
                      <span className="text-3xs font-semibold text-slate-500 block uppercase">
                        Estimasi Imbalan
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-[#0F172A] truncate block mt-0.5">
                        {formattedReward}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100">
                      <span className="text-3xs font-semibold text-slate-500 block uppercase">
                        Batas Waktu
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-[#0F172A] truncate block mt-0.5">
                        {formattedDeadline}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100">
                      <span className="text-3xs font-semibold text-slate-500 block uppercase">
                        Durasi
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-[#0F172A] truncate block mt-0.5">
                        {project.durationWeeks ? `${project.durationWeeks} Minggu` : "Fleksibel"}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100">
                      <span className="text-3xs font-semibold text-slate-500 block uppercase">
                        Komitmen Waktu
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-[#0F172A] truncate block mt-0.5">
                        {project.hoursPerWeek ? `${project.hoursPerWeek} jam / mgg` : "Fleksibel"}
                      </span>
                    </div>
                  </div>

                  {project.rewardNote && (
                    <div className="text-xs p-3 rounded-2xl bg-sky-50 border border-sky-100 text-sky-900">
                      <strong>Catatan Imbalan / Manfaat:</strong> {project.rewardNote}
                    </div>
                  )}
                </CardHeader>
              </Card>

              {/* Description Section */}
              <Card className="border-sky-100 bg-white shadow-md shadow-sky-100/50">
                <CardHeader className="p-6 pb-3">
                  <CardTitle className="text-base font-black text-[#0F172A]">
                    Deskripsi Lengkap Proyek
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {project.description}
                </CardContent>
              </Card>

              {/* Required Skills Section with Talent Fit Comparison */}
              <Card className="border-sky-100 bg-white shadow-md shadow-sky-100/50">
                <CardHeader className="p-6 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-black text-[#0F172A]">
                      Keahlian Yang Diperlukan
                    </CardTitle>
                    <span className="text-xs text-slate-500">
                      Tanda (*) = Wajib dipenuhi
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {project.skills.map((skill) => {
                      const isAdequate = skill.talentStatus.isAdequate;
                      const possessed = skill.talentStatus.possessed;

                      return (
                        <div
                          key={skill.skillId}
                          className={`p-3 rounded-xl border transition-all ${
                            isAdequate
                              ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                              : possessed
                              ? "bg-amber-50/70 border-amber-200 text-amber-950"
                              : "bg-sky-50 border-sky-200 text-slate-700"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="font-bold text-sm flex items-center gap-1.5">
                                <span>{skill.name}</span>
                                {skill.isRequired && (
                                  <span className="text-rose-600 text-xs font-extrabold" title="Skill Wajib">*</span>
                                )}
                              </div>
                              <div className="text-2xs text-slate-500">
                                Standar proyek: min. <span className="font-semibold capitalize">{skill.minLevel}</span>
                              </div>
                            </div>

                            {isAdequate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                                <CheckCircle2 className="h-3 w-3" />
                                Memenuhi
                              </span>
                            ) : possessed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-100 text-amber-800 shrink-0">
                                <TrendingUp className="h-3 w-3" />
                                Perlu Tingkat
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-sky-100 text-sky-800 shrink-0">
                                Belum Ada
                              </span>
                            )}
                          </div>

                          <div className="mt-2 pt-2 border-t border-sky-100 text-2xs">
                            {possessed ? (
                              <span className="text-slate-600">
                                Levelmu saat ini: <strong className="capitalize">{skill.talentStatus.talentLevel}</strong>
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">
                                Belum kamu daftarkan di profil talent
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Vendor Organization Profile */}
              {project.vendor && (
                <Card className="border-sky-100 bg-white shadow-md shadow-sky-100/50">
                  <CardHeader className="p-6 pb-3">
                    <CardTitle className="text-base font-black text-[#0F172A] flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-sky-600" />
                      <span>Tentang Organisasi Vendor</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-3 text-xs text-slate-600">
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      {project.vendor.organizationName}
                    </h3>
                    {project.vendor.description && (
                      <p className="leading-relaxed">{project.vendor.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-slate-500">
                      {project.vendor.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-sky-600" />
                          <span>{project.vendor.location}</span>
                        </div>
                      )}
                      {project.vendor.website && (
                        <a
                          href={
                            project.vendor.website.startsWith("http")
                              ? project.vendor.website
                              : `https://${project.vendor.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sky-700 hover:text-sky-900 underline"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          <span>Kunjungi Website Organisasi</span>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Apply Action Section */}
              <Card className="border-sky-100 bg-white shadow-md shadow-sky-100/50">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <h4 className="text-sm font-bold text-[#0F172A]">
                        Tertarik dengan Proyek Ini?
                      </h4>
                      <p className="text-xs text-slate-500">
                        Kirimkan lamaranmu beserta pesan singkat untuk meyakinkan pihak vendor.
                      </p>
                    </div>

                    <div className="shrink-0 w-full sm:w-auto">
                      <ApplyDialog
                        projectId={project.id}
                        projectTitle={project.title}
                        vendorName={project.vendor?.organizationName || "Vendor"}
                        projectStatus={project.status}
                        currentMatchScore={project.matchResult.score}
                        existingApplication={existingApplication}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column (5 cols): "Kecocokanmu" Panel */}
            <div className="lg:col-span-5 sticky top-6 space-y-4">
              <MatchBreakdownPanel
                matchResult={project.matchResult}
                hasConfiguredSkills={true}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
