"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MatchScoreBadge } from "@/components/talent/match-score-badge";
import {
  GraduationCap,
  MapPin,
  Clock,
  Star,
  ExternalLink,
  MessageSquare,
  Mail,
  Award,
  FileText,
  Download,
  LoaderCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  BookOpen,
  Briefcase,
  ShieldAlert,
} from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { Button } from "@/components/ui/button";
import type { DetailedApplicantItem } from "@/app/vendor/projects/[id]/applicants/actions";
import { getApplicantCvDownloadUrl } from "@/app/talent/profile/cv-actions";
import { toast } from "sonner";

interface ApplicantDetailModalProps {
  applicant: DetailedApplicantItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenReview?: (applicant: DetailedApplicantItem) => void;
}

export function ApplicantDetailModal({
  applicant,
  isOpen,
  onClose,
  onOpenReview,
}: ApplicantDetailModalProps) {
  const [isDownloadingCv, setIsDownloadingCv] = React.useState(false);

  const handleDownloadCv = async () => {
    if (!applicant) return;
    const downloadWindow = window.open("about:blank", "_blank");
    if (!downloadWindow) {
      toast.error("Izinkan tab baru untuk mengunduh CV dengan aman.");
      return;
    }

    setIsDownloadingCv(true);
    try {
      const result = await getApplicantCvDownloadUrl(applicant.id);
      if (!result.url) {
        downloadWindow.close();
        throw new Error(result.error || "CV tidak dapat diunduh.");
      }
      downloadWindow.location.replace(result.url);
    } catch (error) {
      downloadWindow.close();
      toast.error(error instanceof Error ? error.message : "CV tidak dapat diunduh.");
    } finally {
      setIsDownloadingCv(false);
    }
  };

  if (!applicant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-2xl p-6 space-y-5">
        <DialogHeader className="pb-3 border-b border-[#F7ECEA]">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <Avatar
                fallback={applicant.talentName}
                className="h-14 w-14 text-lg font-bold bg-[#F7ECEA] text-[#b87a65] shrink-0"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold text-[#4a3728]">
                    {applicant.talentName}
                  </DialogTitle>
                  <Badge
                    variant={
                      applicant.status === "accepted"
                        ? "success"
                        : applicant.status === "rejected"
                        ? "destructive"
                        : applicant.status === "completed"
                        ? "default"
                        : "warning"
                    }
                    className="capitalize text-2xs font-semibold px-2"
                  >
                    {applicant.status === "pending"
                      ? "Menunggu Keputusan"
                      : applicant.status}
                  </Badge>
                </div>

                {applicant.headline && (
                  <p className="text-xs font-medium text-[#7a6559]">
                    {applicant.headline}
                  </p>
                )}

                {/* Privasi: Email talent hanya terlihat oleh vendor setelah melamar */}
                <div className="flex items-center gap-1.5 text-xs text-[#b87a65] font-semibold pt-0.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span>
                    {applicant.contactEmail
                      ? applicant.contactEmail
                      : "Email kontak tersimpan di akun pelamar"}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 space-y-1 sm:text-right">
              <div className="text-3xs text-[#a89080] font-semibold uppercase">
                Skor Kecocokan (Real-time)
              </div>
              <MatchScoreBadge score={applicant.latestMatchScore} size="md" />
            </div>
          </div>
        </DialogHeader>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-[#F7ECEA] border border-[#F7ECEA]">
            <span className="text-3xs text-[#a89080] block font-semibold uppercase">
              Pendidikan
            </span>
            <div className="flex items-center gap-1 font-semibold text-[#5c4639] mt-0.5 truncate">
              <GraduationCap className="h-3.5 w-3.5 text-[#a89080] shrink-0" />
              <span className="truncate">{applicant.education || "-"}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7ECEA] border border-[#F7ECEA]">
            <span className="text-3xs text-[#a89080] block font-semibold uppercase">
              Lokasi
            </span>
            <div className="flex items-center gap-1 font-semibold text-[#5c4639] mt-0.5 truncate">
              <MapPin className="h-3.5 w-3.5 text-[#a89080] shrink-0" />
              <span className="truncate">{applicant.location || "-"}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7ECEA] border border-[#F7ECEA]">
            <span className="text-3xs text-[#a89080] block font-semibold uppercase">
              Ketersediaan Jam
            </span>
            <div className="flex items-center gap-1 font-semibold text-[#5c4639] mt-0.5 truncate">
              <Clock className="h-3.5 w-3.5 text-[#a89080] shrink-0" />
              <span className="truncate">
                {applicant.hoursPerWeek ? `${applicant.hoursPerWeek} jam/mgg` : "Fleksibel"}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7ECEA] border border-[#F7ECEA]">
            <span className="text-3xs text-[#a89080] block font-semibold uppercase">
              Rating & Selesai
            </span>
            <div className="flex items-center gap-1 font-semibold text-[#5c4639] mt-0.5 truncate">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
              <span>
                {applicant.avgRating !== null ? applicant.avgRating.toFixed(1) : "3.0"}
              </span>
              <span className="text-[#a89080]">({applicant.completedProjectsCount} selesai)</span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* AI SCREENING RESULTS & CV EVIDENCE SECTION                        */}
        {/* ================================================================= */}
        {applicant.aiScreening && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200/70 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    AI Screening Evaluation &amp; CV Evidence
                  </h4>
                  <p className="text-3xs text-slate-600">
                    Evaluasi deterministik berbasis kriteria HR dan hasil ekstraksi teks CV
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-3xs border-sky-300 bg-white text-sky-900 font-bold"
              >
                Status Screening: {applicant.screeningStatus.toUpperCase()}
              </Badge>
            </div>

            {/* AI Candidate Summary & Explanation */}
            <div className="space-y-2 rounded-xl bg-white border border-sky-100 p-3.5">
              <p className="text-2xs font-bold uppercase tracking-wider text-sky-800">
                AI-Generated Candidate Summary
              </p>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">
                {applicant.aiScreening.candidateSummary}
              </p>
              <p className="text-2xs text-slate-600 leading-relaxed pt-1 border-t border-slate-100">
                <strong>Rincian Evaluasi Kriteria:</strong> {applicant.aiScreening.explanation}
              </p>
            </div>

            {/* Deterministic Weighted Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-xl bg-white border border-sky-100 p-2.5">
                <span className="text-3xs text-slate-500 block font-semibold">
                  Skill Match (55%)
                </span>
                <span className="text-sm font-black text-sky-800">
                  {applicant.aiScreening.criteriaBreakdown.requiredAndPreferredSkillsScore}%
                </span>
              </div>
              <div className="rounded-xl bg-white border border-sky-100 p-2.5">
                <span className="text-3xs text-slate-500 block font-semibold">
                  Level Fit (20%)
                </span>
                <span className="text-sm font-black text-sky-800">
                  {applicant.aiScreening.criteriaBreakdown.competencyLevelFitScore}%
                </span>
              </div>
              <div className="rounded-xl bg-white border border-sky-100 p-2.5">
                <span className="text-3xs text-slate-500 block font-semibold">
                  Availability (15%)
                </span>
                <span className="text-sm font-black text-sky-800">
                  {applicant.aiScreening.criteriaBreakdown.workModeAndAvailabilityScore}%
                </span>
              </div>
              <div className="rounded-xl bg-white border border-sky-100 p-2.5">
                <span className="text-3xs text-slate-500 block font-semibold">
                  Track Record (10%)
                </span>
                <span className="text-sm font-black text-sky-800">
                  {applicant.aiScreening.criteriaBreakdown.trackRecordAndCvEvidenceScore}%
                </span>
              </div>
            </div>

            {/* Matched Skills & Missing Skills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-white border border-emerald-200/80 p-3 space-y-1.5">
                <span className="text-2xs font-bold text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Matched Skills ({applicant.aiScreening.matchedSkills.length})
                </span>
                {applicant.aiScreening.matchedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {applicant.aiScreening.matchedSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-3xs font-semibold text-emerald-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-2xs text-slate-500 italic">Belum ada skill yang cocok.</p>
                )}
              </div>

              <div className="rounded-xl bg-white border border-rose-200/80 p-3 space-y-1.5">
                <span className="text-2xs font-bold text-rose-900 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  Missing Skills ({applicant.aiScreening.missingSkills.length})
                </span>
                {applicant.aiScreening.missingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {applicant.aiScreening.missingSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-3xs font-semibold text-rose-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-2xs text-emerald-700 font-semibold">
                    Seluruh keahlian lowongan terpenuhi.
                  </p>
                )}
              </div>
            </div>

            {/* Relevant Experience & Qualifications */}
            {(applicant.aiScreening.relevantExperience.length > 0 ||
              applicant.aiScreening.relevantQualifications.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-white border border-sky-100 p-3 space-y-1.5">
                  <span className="text-2xs font-bold text-slate-800 flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5 text-sky-700" />
                    Pengalaman Relevan
                  </span>
                  {applicant.aiScreening.relevantExperience.length > 0 ? (
                    <ul className="space-y-1 text-2xs text-slate-700 list-disc pl-4">
                      {applicant.aiScreening.relevantExperience.map((exp, i) => (
                        <li key={i}>{exp}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-2xs text-slate-500 italic">
                      Belum ada riwayat pengalaman kerja terstruktur.
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-white border border-sky-100 p-3 space-y-1.5">
                  <span className="text-2xs font-bold text-slate-800 flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5 text-sky-700" />
                    Kualifikasi &amp; Pendidikan Relevan
                  </span>
                  {applicant.aiScreening.relevantQualifications.length > 0 ? (
                    <ul className="space-y-1 text-2xs text-slate-700 list-disc pl-4">
                      {applicant.aiScreening.relevantQualifications.map((qual, i) => (
                        <li key={i}>{qual}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-2xs text-slate-500 italic">
                      Belum ada data pendidikan tercantum.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* CV Page References & Evidence Snippets */}
            <div className="rounded-xl bg-white border border-sky-100 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold text-slate-900 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-sky-700" />
                  Bukti &amp; Referensi Halaman CV ({applicant.aiScreening.cvEvidence.length})
                </span>
                {applicant.aiScreening.cvPageCount && (
                  <span className="text-3xs font-semibold text-slate-500">
                    Total {applicant.aiScreening.cvPageCount} Halaman PDF
                  </span>
                )}
              </div>

              {applicant.aiScreening.cvEvidence.length > 0 ? (
                <div className="space-y-2">
                  {applicant.aiScreening.cvEvidence.map((ev, idx) => (
                    <div
                      key={`${ev.label}-${idx}`}
                      className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-2.5 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-2xs text-slate-800">{ev.label}</span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-2 py-0 bg-sky-100 text-sky-900"
                        >
                          {ev.sectionLabel}
                        </Badge>
                      </div>
                      <p className="text-2xs text-slate-600 italic leading-relaxed">
                        &ldquo;{ev.excerpt}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-2xs text-slate-500 italic">
                  Tidak ada teks PDF CV yang diekstraksi; evaluasi didasarkan pada profil keahlian dan pengalaman kandidat.
                </p>
              )}
            </div>

            {/* Assistive AI Governance Notice */}
            <div className="flex items-center gap-2 rounded-xl bg-amber-50/90 border border-amber-200 px-3 py-2 text-2xs text-amber-900">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-700" />
              <span>
                <strong>Catatan HR:</strong> AI hanya memberikan rekomendasi dan evaluasi berbasis bukti. Keputusan shortlist, interview, atau reject tetap berada sepenuhnya di tangan HR.
              </span>
            </div>
          </div>
        )}

        {/* Bio */}
        {applicant.bio && (
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-[#5c4639]">Tentang Talenta</h4>
            <p className="text-[#7a6559] leading-relaxed bg-[#F7ECEA] p-3 rounded-xl border border-[#F7ECEA] whitespace-pre-wrap">
              {applicant.bio}
            </p>
          </div>
        )}

        {/* Education history and work experience */}
        {applicant.educationHistory.length > 0 && (
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-[#5c4639]">Riwayat Pendidikan</h4>
            <div className="space-y-2">
              {applicant.educationHistory.map((education, index) => (
                <div key={`${education.institution}-${index}`} className="rounded-xl border border-[#F7ECEA] bg-[#F7ECEA]/50 p-3">
                  <p className="font-semibold text-[#5c4639]">{education.degree} {education.fieldOfStudy}</p>
                  <p className="mt-0.5 text-[#7a6559]">{education.institution}</p>
                  {(education.startDate || education.endDate) && (
                    <p className="mt-0.5 text-2xs text-[#a89080]">
                      {education.startDate || "—"} – {education.endDate || "Saat ini"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {applicant.workExperience.length > 0 && (
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-[#5c4639]">Pengalaman Kerja</h4>
            <div className="space-y-2">
              {applicant.workExperience.map((experience, index) => (
                <div key={`${experience.company}-${index}`} className="rounded-xl border border-[#F7ECEA] bg-[#F7ECEA]/50 p-3">
                  <p className="font-semibold text-[#5c4639]">{experience.role} · {experience.company}</p>
                  {(experience.startDate || experience.endDate || experience.isCurrent) && (
                    <p className="mt-0.5 text-2xs text-[#a89080]">
                      {experience.startDate || "—"} – {experience.isCurrent ? "Saat ini" : experience.endDate || "—"}
                    </p>
                  )}
                  {experience.description && (
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed text-[#7a6559]">{experience.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Application CV snapshot */}
        <div className="flex flex-col gap-3 rounded-xl border border-sky-100 bg-sky-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2.5">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800">CV pada saat melamar</p>
              {applicant.candidateCvName ? (
                <p className="mt-0.5 truncate text-2xs text-slate-600">{applicant.candidateCvName}</p>
              ) : (
                <p className="mt-0.5 text-2xs text-slate-500">Pelamar tidak menyertakan CV.</p>
              )}
            </div>
          </div>
          {applicant.candidateCvName && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDownloadCv}
              disabled={isDownloadingCv}
              className="h-8 shrink-0 gap-1.5 border-sky-200 text-xs text-sky-800"
            >
              {isDownloadingCv ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Unduh snapshot
            </Button>
          )}
        </div>

        {/* Message from talent */}
        {applicant.message && (
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-[#5c4639] flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-[#C98B75]" />
              <span>Pesan Lamaran</span>
            </h4>
            <p className="text-[#695449] bg-[#F7ECEA]/50 border border-[#F7ECEA] p-3 rounded-xl leading-relaxed whitespace-pre-wrap">
              {applicant.message}
            </p>
          </div>
        )}

        {/* Skills section */}
        <div className="space-y-2 text-xs">
          <h4 className="font-bold text-[#5c4639] flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-[#C98B75]" />
            <span>Keahlian & Level Penguasaan ({applicant.allTalentSkills.length})</span>
          </h4>
          {applicant.allTalentSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {applicant.allTalentSkills.map((s) => (
                <div
                  key={s.skillId}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F7ECEA] border border-[#e8d5d0] text-xs"
                >
                  <span className="font-medium text-[#5c4639]">{s.name}</span>
                  <Badge variant="secondary" className="text-3xs capitalize px-1.5 py-0 h-4">
                    {s.level}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#a89080] italic">Talenta belum mendaftarkan keahlian spesifik.</p>
          )}
        </div>

        {/* Portfolio URLs */}
        {applicant.portfolioUrls && applicant.portfolioUrls.length > 0 && (
          <div className="space-y-1.5 text-xs">
            <h4 className="font-bold text-[#5c4639]">Portofolio & Tautan Karya</h4>
            <div className="flex flex-wrap gap-2">
              {applicant.portfolioUrls.map((url, idx) => (
                <a
                  key={idx}
                  href={url.startsWith("http") ? url : `https://${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#F9F5DC] border border-[#f0e8c0] text-[#b89e5e] hover:bg-[#F9F5DC] text-xs font-medium transition-colors"
                >
                  <span className="truncate max-w-[220px]">{url}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Completed Project Review Section */}
        {applicant.status === "completed" && (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <h4 className="font-bold text-xs text-amber-950 uppercase tracking-wider">
                  Penilaian Proyek Ini
                </h4>
              </div>
              {onOpenReview && (
                <Button
                  size="sm"
                  onClick={() => onOpenReview(applicant)}
                  className={
                    applicant.review
                      ? "bg-white text-amber-800 hover:bg-amber-100 border border-amber-200 text-xs h-7 px-2.5 font-semibold"
                      : "bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 px-2.5 font-bold shadow-xs"
                  }
                >
                  <Star className="h-3 w-3 fill-current" />
                  <span>
                    {applicant.review ? "Lihat Penilaian" : "Beri Penilaian"}
                  </span>
                </Button>
              )}
            </div>
            {applicant.review ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <StarRating
                    value={applicant.review.rating}
                    readOnly
                    size="sm"
                    showValue
                  />
                  <span className="text-2xs text-[#8a7668]">
                    diberikan pada{" "}
                    {new Date(applicant.review.createdAt).toLocaleDateString(
                      "id-ID"
                    )}
                  </span>
                </div>
                {applicant.review.comment && (
                  <p className="text-xs text-[#695449] italic bg-white/70 p-2.5 rounded-lg border border-amber-100">
                    &ldquo;{applicant.review.comment}&rdquo;
                  </p>
                )}
              </div>
            ) : (
              <p className="text-2xs text-amber-800 leading-relaxed">
                Proyek ini telah selesai dikerjakan. Berikan penilaian performa kerja untuk membantu talenta muda membangun reputasi profesionalnya.
              </p>
            )}
          </div>
        )}

        {/* Reviews History */}
        <div className="space-y-2 text-xs pt-2 border-t border-[#F7ECEA]">
          <h4 className="font-bold text-[#5c4639] flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            <span>Riwayat Ulasan Vendor ({applicant.reviews.length})</span>
          </h4>

          {applicant.reviews.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {applicant.reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-3 rounded-xl bg-[#F7ECEA] border border-[#F7ECEA] space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between text-2xs">
                    <span className="font-semibold text-[#695449]">
                      {rev.vendorName}
                    </span>
                    <StarRating
                      value={rev.rating}
                      readOnly
                      size="sm"
                      showValue
                    />
                  </div>
                  {rev.comment && (
                    <p className="text-[#7a6559] text-2xs italic leading-relaxed">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#a89080] italic">Belum ada riwayat ulasan dari proyek sebelumnya.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
