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
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MatchScoreBadge } from "@/components/talent/match-score-badge";
import { MatchBreakdownPanel } from "@/components/talent/match-breakdown-panel";
import { ApplyDialog } from "@/components/talent/apply-dialog";
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
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-rose-200 bg-white p-8 text-center space-y-4 shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Proyek Tidak Ditemukan</h2>
            <p className="text-xs text-slate-600">
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <Link href="/talent/projects">
              <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900 text-xs">
                <ArrowLeft className="h-4 w-4" />
                <span>Kembali ke Daftar Proyek</span>
              </Button>
            </Link>

            <MatchScoreBadge score={project.matchResult.score} size="md" />
          </div>

          {/* Main 2-Column Grid: Left (Project Info) & Right (Match Breakdown Panel) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column (8 cols): Project Details */}
            <div className="lg:col-span-7 space-y-6">
              {/* Project Header Card */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={diffInfo.variant} className="text-xs">
                        {diffInfo.label}
                      </Badge>
                      <Badge variant={typeInfo.variant} className="text-xs">
                        {typeInfo.label}
                      </Badge>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        <span>{modeInfo.icon}</span>
                        <span>{modeInfo.label}</span>
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Status: Open
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                      {project.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span>{project.vendor?.organizationName || "Organisasi Vendor"}</span>
                      </div>
                      {project.vendor?.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{project.vendor.location}</span>
                        </div>
                      )}
                      <div>Diposting: {formattedCreatedAt}</div>
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-3xs font-semibold text-slate-400 block uppercase">
                        Estimasi Imbalan
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block mt-0.5">
                        {formattedReward}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-3xs font-semibold text-slate-400 block uppercase">
                        Batas Waktu
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block mt-0.5">
                        {formattedDeadline}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-3xs font-semibold text-slate-400 block uppercase">
                        Durasi
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block mt-0.5">
                        {project.durationWeeks ? `${project.durationWeeks} Minggu` : "Fleksibel"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-3xs font-semibold text-slate-400 block uppercase">
                        Komitmen Waktu
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block mt-0.5">
                        {project.hoursPerWeek ? `${project.hoursPerWeek} jam / mgg` : "Fleksibel"}
                      </span>
                    </div>
                  </div>

                  {project.rewardNote && (
                    <div className="text-xs p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-purple-900">
                      <strong>Catatan Imbalan / Manfaat:</strong> {project.rewardNote}
                    </div>
                  )}
                </CardHeader>
              </Card>

              {/* Description Section */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="p-6 pb-3">
                  <CardTitle className="text-base font-bold text-slate-900">
                    Deskripsi Lengkap Proyek
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {project.description}
                </CardContent>
              </Card>

              {/* Required Skills Section with Talent Fit Comparison */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="p-6 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-slate-900">
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
                              : "bg-slate-50 border-slate-200 text-slate-800"
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
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-slate-200/70 text-slate-600 shrink-0">
                                Belum Ada
                              </span>
                            )}
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-200/60 text-2xs">
                            {possessed ? (
                              <span className="text-slate-600">
                                Levelmu saat ini: <strong className="capitalize">{skill.talentStatus.talentLevel}</strong>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">
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
                <Card className="border-slate-200 bg-white shadow-xs">
                  <CardHeader className="p-6 pb-3">
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-purple-600" />
                      <span>Tentang Organisasi Vendor</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-3 text-xs text-slate-600">
                    <h3 className="text-sm font-bold text-slate-900">
                      {project.vendor.organizationName}
                    </h3>
                    {project.vendor.description && (
                      <p className="leading-relaxed">{project.vendor.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-slate-500">
                      {project.vendor.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
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
                          className="flex items-center gap-1 text-purple-600 hover:text-purple-700 underline"
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
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <h4 className="text-sm font-bold text-slate-900">
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
