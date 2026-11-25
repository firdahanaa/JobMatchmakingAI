import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { VendorPageNavigation } from "@/components/vendor/vendor-page-navigation";
import { getProjectApplicantsRecalculated } from "./actions";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  AlertCircle,
  Edit3,
  Briefcase,
  Clock,
  Calendar,
  Coins,
  CheckCircle2,
  Sparkles,
  FileText,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchScoreBadge } from "@/components/talent/match-score-badge";
import { ApplicantsManager } from "@/components/vendor/applicants-manager";
import type { Metadata } from "next";

interface ApplicantsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ApplicantsPageProps): Promise<Metadata> {
  const { id } = await params;
  const { data } = await getProjectApplicantsRecalculated(id);
  return {
    title: data?.project?.title
      ? `Detail Lowongan & Pelamar: ${data.project.title}`
      : "Detail Lowongan & Evaluasi Pelamar",
    description:
      "Ringkasan lowongan, kriteria evaluasi deterministik, daftar pelamar yang masuk, dan rekomendasi talenta.",
  };
}

export default async function ApplicantsPage({ params }: ApplicantsPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await getProjectApplicantsRecalculated(id);

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7ECEA]">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-rose-200 bg-white p-8 text-center space-y-4 shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-[#4a3728]">Gagal Memuat Detail Lowongan</h2>
            <p className="text-sm text-[#7a6559]">{error || "Lowongan tidak ditemukan."}</p>
            <div className="pt-2">
              <Link href="/vendor/dashboard">
                <Button className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { project, applicants, recommendedTalents } = data;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7ECEA]">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <VendorPageNavigation activePage="vacancies" />

          {/* Breadcrumb Flow: My Vacancies -> Select Vacancy -> View Applicants -> Candidate Details -> AI Screening Results */}
          <div className="flex flex-wrap items-center gap-1.5 text-2xs font-bold text-[#8a7668] bg-white/80 border border-[#e8d5d0] rounded-xl px-3.5 py-2">
            <Link href="/vendor/dashboard#my-vacancies" className="text-[#b87a65] hover:underline">
              My Vacancies
            </Link>
            <span>&rarr;</span>
            <span className="text-[#4a3728]">{project.title}</span>
            <span>&rarr;</span>
            <span className="text-[#b87a65]">View Applicants ({applicants.length})</span>
            <span>&rarr;</span>
            <span>Candidate Details</span>
            <span>&rarr;</span>
            <span>AI Screening Results</span>
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Link
                href="/vendor/dashboard#my-vacancies"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8a7668] hover:text-[#5c4639] transition-colors mb-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke My Vacancies
              </Link>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#4a3728]">
                  {project.title}
                </h1>
                <Badge
                  variant={
                    project.status === "open"
                      ? "success"
                      : project.status === "in_progress"
                      ? "default"
                      : "outline"
                  }
                  className="text-xs uppercase"
                >
                  {project.status === "open" ? "ACTIVE" : project.status}
                </Badge>
                <Badge variant="secondary" className="text-xs font-bold">
                  {applicants.length} Applicants
                </Badge>
                {applicants.filter((a) => a.status === "pending").length > 0 && (
                  <Badge
                    variant="warning"
                    className="text-xs font-extrabold bg-amber-100 text-amber-900 border-amber-300"
                  >
                    {applicants.filter((a) => a.status === "pending").length} New Applicants
                  </Badge>
                )}
              </div>
            </div>

            <Link href={`/vendor/projects/${id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Lowongan</span>
              </Button>
            </Link>
          </div>

          {/* ================================================================= */}
          {/* SECTION A: VACANCY OVERVIEW & DETERMINISTIC EVALUATION CRITERIA   */}
          {/* ================================================================= */}
          <section
            aria-labelledby="vacancy-overview-heading"
            className="rounded-2xl border border-[#e8d5d0] bg-white p-6 shadow-xs space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#F7ECEA] pb-3.5">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[#C98B75]" />
                <h2 id="vacancy-overview-heading" className="text-base font-bold text-[#4a3728]">
                  A. Ringkasan Lowongan &amp; Kriteria Evaluasi Screening
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-2xs">
                <Badge variant="outline" className="capitalize">
                  {project.type}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  Level: {project.difficulty}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  Mode: {project.mode}
                </Badge>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#695449] leading-relaxed whitespace-pre-wrap">
              {project.description}
            </p>

            {/* Key Attributes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl bg-[#fbf8f6] border border-[#e8d5d0] p-3">
                <span className="text-3xs font-bold uppercase text-[#a89080] block">
                  Komitmen Waktu
                </span>
                <span className="font-bold text-[#4a3728] flex items-center gap-1 mt-0.5">
                  <Clock className="h-3.5 w-3.5 text-[#C98B75]" />
                  {project.hoursPerWeek ? `${project.hoursPerWeek} jam/mgg` : "Fleksibel"}
                </span>
              </div>
              <div className="rounded-xl bg-[#fbf8f6] border border-[#e8d5d0] p-3">
                <span className="text-3xs font-bold uppercase text-[#a89080] block">Durasi</span>
                <span className="font-bold text-[#4a3728] block mt-0.5">
                  {project.durationWeeks ? `${project.durationWeeks} minggu` : "Fleksibel"}
                </span>
              </div>
              <div className="rounded-xl bg-[#fbf8f6] border border-[#e8d5d0] p-3">
                <span className="text-3xs font-bold uppercase text-[#a89080] block">
                  Kompensasi
                </span>
                <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                  <Coins className="h-3.5 w-3.5" />
                  {project.rewardAmount && project.rewardAmount > 0
                    ? `Rp ${project.rewardAmount.toLocaleString("id-ID")}`
                    : project.type === "volunteer"
                    ? "Sukarela"
                    : "Sesuai Kesepakatan"}
                </span>
              </div>
              <div className="rounded-xl bg-[#fbf8f6] border border-[#e8d5d0] p-3">
                <span className="text-3xs font-bold uppercase text-[#a89080] block">Deadline</span>
                <span className="font-bold text-[#4a3728] flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-[#C98B75]" />
                  {project.deadline
                    ? new Date(project.deadline).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Fleksibel"}
                </span>
              </div>
            </div>

            {/* Required & Preferred Skills */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#695449]">
                Kualifikasi Keahlian yang Dibutuhkan ({project.skills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {project.skills.map((skill) => (
                  <span
                    key={skill.skillId}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold ${
                      skill.isRequired
                        ? "border-[#e0c4bc] bg-[#F7ECEA] text-[#5c3a2e]"
                        : "border-[#e8d5d0] bg-[#fbf8f6] text-[#7a6559]"
                    }`}
                  >
                    <span>{skill.name}</span>
                    <span className="text-2xs opacity-80 capitalize">(min. {skill.minLevel})</span>
                    {skill.isRequired ? (
                      <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 bg-[#b87a65]">
                        Wajib
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                        Preferred
                      </Badge>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Deterministic Evaluation Criteria Configuration */}
            <div className="space-y-2 border-t border-[#F7ECEA] pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#695449]">
                  Konfigurasi Bobot Kriteria Evaluasi Deterministik (Total 100%)
                </h3>
                <Badge variant="success" className="text-3xs">
                  Deterministic Weighted Scoring
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                {project.evaluationCriteria.map((criterion) => (
                  <div
                    key={criterion.name}
                    className="rounded-xl border border-[#e8d5d0] bg-[#fbf8f6] p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-[#4a3728]">
                      <span className="truncate">{criterion.name}</span>
                      <span className="text-[#b87a65]">{criterion.weightPercent}%</span>
                    </div>
                    <p className="text-3xs text-[#8a7668] leading-relaxed">
                      {criterion.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ================================================================= */}
          {/* SECTION B: CONFIRMED APPLICANTS FOR THIS VACANCY                  */}
          {/* ================================================================= */}
          <section aria-labelledby="confirmed-applicants-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2
                  id="confirmed-applicants-heading"
                  className="text-lg font-extrabold text-[#4a3728]"
                >
                  B. Daftar Pelamar yang Mengajukan Lamaran ({applicants.length})
                </h2>
                <p className="text-xs text-[#7a6559]">
                  Kandidat di bawah ini telah mengirimkan lamaran resmi beserta snapshot CV mereka untuk lowongan ini.
                </p>
              </div>
            </div>

            <ApplicantsManager
              projectId={project.id}
              projectTitle={project.title}
              projectStatus={project.status}
              initialApplicants={applicants}
            />
          </section>

          {/* ================================================================= */}
          {/* SECTION C: RECOMMENDED TALENT (SEPARATE FROM APPLICANTS)          */}
          {/* ================================================================= */}
          <section
            aria-labelledby="recommended-talent-heading"
            className="rounded-2xl border border-[#e0c4bc] bg-white p-6 shadow-xs space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-[#F7ECEA] pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-2xs font-bold text-amber-900">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  <span>Saran Profil Kandidat (Belum Melamar)</span>
                </div>
                <h2
                  id="recommended-talent-heading"
                  className="text-lg font-extrabold text-[#4a3728]"
                >
                  C. Recommended Talent untuk Lowongan Ini ({recommendedTalents.length})
                </h2>
                <p className="text-xs text-[#7a6559] leading-relaxed">
                  Daftar ini terpisah dari pelamar aktif. Menampilkan profil Talent di platform yang memenuhi kriteria lowongan berdasarkan evaluasi deterministik, namun <strong>belum mengajukan lamaran</strong> pada lowongan ini.
                </p>
              </div>
              <Badge variant="outline" className="w-fit text-2xs border-[#e0c4bc] text-[#7a4f3f]">
                Bukan Pelamar Terkonfirmasi
              </Badge>
            </div>

            {recommendedTalents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedTalents.map((rec) => (
                  <div
                    key={rec.talentId}
                    className="rounded-2xl border border-[#e8d5d0] bg-[#fbf8f6] p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-[#4a3728] truncate">
                              {rec.talentName}
                            </h3>
                            <Badge variant="secondary" className="text-3xs">
                              Belum Melamar
                            </Badge>
                          </div>
                          {rec.headline && (
                            <p className="text-xs text-[#7a6559] line-clamp-1 mt-0.5">
                              {rec.headline}
                            </p>
                          )}
                        </div>
                        <MatchScoreBadge score={rec.matchScore} size="sm" />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-2xs text-[#695449]">
                        {rec.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-[#C98B75]" />
                            {rec.location}
                          </span>
                        )}
                        {rec.hoursPerWeek && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-[#C98B75]" />
                            {rec.hoursPerWeek} jam/mgg
                          </span>
                        )}
                        {rec.hasUploadedCv && (
                          <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
                            <FileText className="h-3 w-3 text-emerald-600" />
                            CV Terdaftar
                          </span>
                        )}
                      </div>

                      {/* Matched Skills */}
                      <div className="flex flex-wrap gap-1.5">
                        {rec.matchedSkills.map((skillName) => (
                          <span
                            key={skillName}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-3xs font-semibold text-emerald-800"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                            {skillName}
                          </span>
                        ))}
                        {rec.underLevelSkills.map((u) => (
                          <span
                            key={u.name}
                            className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-3xs font-medium text-amber-800"
                          >
                            {u.name} ({u.has})
                          </span>
                        ))}
                      </div>

                      <p className="text-2xs text-[#5c4639] bg-white border border-[#e8d5d0] rounded-xl p-2.5 leading-relaxed">
                        <strong>Alasan Rekomendasi:</strong> {rec.explanation}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#e8d5d0] flex items-center justify-between text-3xs text-[#8a7668]">
                      <span>Sumber: {rec.recommendationSource}</span>
                      <span className="font-bold text-[#7a4f3f]">
                        Skill {rec.matchBreakdown.skill}% · Level {rec.matchBreakdown.levelFit}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#d4b0a5] bg-[#fbf8f6] p-8 text-center space-y-1.5">
                <p className="text-xs font-bold text-[#4a3728]">
                  Belum Ada Rekomendasi Tambahan di Luar Pelamar Saat Ini
                </p>
                <p className="text-2xs text-[#8a7668] max-w-md mx-auto">
                  Seluruh kandidat yang cocok dengan keahlian lowongan ini sudah melamar atau belum ada profil talenta baru yang sesuai.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
