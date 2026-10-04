"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  Scale,
  Mail,
  MessageSquare,
  MapPin,
  Check,
  TrendingUp,
  FolderCheck,
  Eye,
  Info,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchScoreBadge } from "@/components/talent/match-score-badge";
import { ApplicantDetailModal } from "./applicant-detail-modal";
import { ApplicantCompareModal } from "./applicant-compare-modal";
import { ReviewApplicantDialog } from "./review-applicant-dialog";
import { updateApplicantStatus, type DetailedApplicantItem } from "@/app/vendor/projects/[id]/applicants/actions";

interface ApplicantsManagerProps {
  projectId: string;
  projectTitle?: string;
  projectStatus?: string;
  initialApplicants: DetailedApplicantItem[];
}

export function ApplicantsManager({
  projectId,
  projectTitle,
  initialApplicants,
}: ApplicantsManagerProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [detailApplicant, setDetailApplicant] = useState<DetailedApplicantItem | null>(null);
  const [reviewApplicant, setReviewApplicant] = useState<DetailedApplicantItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggleSelect = (applicantId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(applicantId)) {
        return prev.filter((id) => id !== applicantId);
      }
      if (prev.length >= 3) {
        toast.info("Maksimal 3 pelamar untuk dibandingkan.");
        return prev;
      }
      return [...prev, applicantId];
    });
  };

  const handleStatusChange = (
    applicationId: string,
    newStatus: "accepted" | "rejected" | "completed"
  ) => {
    const actionLabel =
      newStatus === "accepted"
        ? "Menerima pelamar ini? Status proyek akan otomatis menjadi 'In Progress'."
        : newStatus === "rejected"
        ? "Menolak lamaran ini?"
        : "Menandai lamaran ini telah selesai?";

    if (!window.confirm(actionLabel)) {
      return;
    }

    startTransition(async () => {
      const res = await updateApplicantStatus(applicationId, projectId, newStatus);
      if (res.success) {
        toast.success(`Status pelamar berhasil diubah menjadi '${newStatus}'!`);
        router.refresh();
      } else {
        toast.error("Gagal mengubah status pelamar", {
          description: res.error || "Terjadi kesalahan.",
        });
      }
    });
  };

  const selectedApplicants = initialApplicants.filter((a) => selectedIds.includes(a.id));

  return (
    <div className="space-y-6">
      {/* Catatan UI Wajib (Requirement 9) */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50/60 to-purple-50 p-4 sm:p-5 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-purple-100 text-purple-700 shrink-0 mt-0.5">
            <Info className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
              Panduan Penilaian Seleksi Vendor
            </h4>
            <p className="text-sm font-semibold text-purple-900 leading-snug">
              &ldquo;Match score adalah indikator bantuan, keputusan akhir ada di tanganmu.&rdquo;
            </p>
            <p className="text-2xs text-purple-700 leading-relaxed">
              Skor kecocokan dihitung secara transparan berdasarkan perbandingan profil keahlian talenta dengan kebutuhan proyek. Gunakan fitur perbandingan untuk meninjau kecakapan secara mendalam.
            </p>
          </div>
        </div>
      </div>

      {/* Action & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Users className="h-4 w-4 text-purple-600" />
          <span>Total {initialApplicants.length} Pelamar Masuk</span>
          <span className="text-slate-300">•</span>
          <span className="text-2xs font-normal text-slate-500">
            Terurut real-time skor kecocokan tertinggi
          </span>
        </div>

        {/* Compare Trigger Button (Requirement 6) */}
        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setIsCompareOpen(true)}
            disabled={selectedIds.length < 2 || selectedIds.length > 3}
            className={`text-xs gap-1.5 font-bold h-9 transition-all ${
              selectedIds.length >= 2 && selectedIds.length <= 3
                ? "bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-400 cursor-not-allowed hover:bg-slate-100"
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>Bandingkan Pelamar ({selectedIds.length} dipilih)</span>
          </Button>

          {selectedIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="text-2xs text-slate-500 hover:text-slate-800 h-9 px-2"
            >
              Batal Pilih
            </Button>
          )}
        </div>
      </div>

      {/* Applicants List */}
      {initialApplicants.length > 0 ? (
        <div className="space-y-4">
          {initialApplicants.map((app) => {
            const isSelected = selectedIds.includes(app.id);

            return (
              <div
                key={app.id}
                className={`rounded-2xl border transition-all duration-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4 ${
                  isSelected
                    ? "border-purple-500 ring-2 ring-purple-500/10 shadow-sm"
                    : "border-slate-200 hover:border-purple-200"
                }`}
              >
                {/* Header Row: Checkbox, Avatar, Name, Email, Match Score */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Checkbox for comparison */}
                    <div className="pt-1 shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(app.id)}
                        className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        title="Pilih untuk dibandingkan (2-3 pelamar)"
                      />
                    </div>

                    <Avatar
                      fallback={app.talentName}
                      className="h-12 w-12 text-base font-bold bg-purple-100 text-purple-700 shrink-0"
                    />

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base truncate">
                          {app.talentName}
                        </h3>

                        <Badge
                          variant={
                            app.status === "accepted"
                              ? "success"
                              : app.status === "rejected"
                              ? "destructive"
                              : app.status === "completed"
                              ? "default"
                              : "warning"
                          }
                          className="capitalize text-3xs font-semibold px-2"
                        >
                          {app.status === "pending"
                            ? "Menunggu Keputusan"
                            : app.status}
                        </Badge>
                      </div>

                      {app.headline && (
                        <p className="text-xs font-medium text-slate-600 line-clamp-1">
                          {app.headline}
                        </p>
                      )}

                      {/* Privasi: Email talent hanya terlihat oleh vendor setelah talent melamar (Requirement 10) */}
                      <div className="flex items-center gap-1.5 text-xs text-purple-700 font-semibold pt-0.5">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {app.contactEmail ? app.contactEmail : "Email tersimpan di akun pelamar"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Match Score Badge (Real-time Recalculated) */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-3xs text-slate-400 font-semibold uppercase">
                      Match Score (Terbaru)
                    </div>
                    <MatchScoreBadge score={app.latestMatchScore} size="md" />
                  </div>
                </div>

                {/* Metrics Strip: Rating, Selesai, Jam Kerja, Mode */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    <div className="truncate">
                      <span className="text-3xs text-slate-400 block font-semibold uppercase">Rating</span>
                      <span className="font-bold text-slate-800">
                        {app.avgRating !== null ? `${app.avgRating.toFixed(1)} / 5.0` : "Baru (3.0)"}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                    <FolderCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <span className="text-3xs text-slate-400 block font-semibold uppercase">Proyek Selesai</span>
                      <span className="font-bold text-slate-800">{app.completedProjectsCount} Proyek</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <div className="truncate">
                      <span className="text-3xs text-slate-400 block font-semibold uppercase">Ketersediaan</span>
                      <span className="font-bold text-slate-800">
                        {app.hoursPerWeek ? `${app.hoursPerWeek} jam/mgg` : "Fleksibel"}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                    <div className="truncate">
                      <span className="text-3xs text-slate-400 block font-semibold uppercase">Preferensi Mode</span>
                      <span className="font-bold text-slate-800 capitalize">
                        {app.preferredMode || "Semua Mode"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Skill Match Overview */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
                      Kesesuaian Keahlian:
                    </span>

                    {/* Matched skills */}
                    {app.matchedSkills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-3xs font-semibold"
                      >
                        <Check className="h-3 w-3 text-emerald-600 stroke-[2.5]" />
                        <span>{s}</span>
                      </span>
                    ))}

                    {/* Under-level skills */}
                    {app.underLevelSkills.map((s) => (
                      <span
                        key={s.name}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-3xs font-medium"
                      >
                        <TrendingUp className="h-3 w-3 text-amber-600" />
                        <span>{s.name} ({s.has} &lt; {s.needs})</span>
                      </span>
                    ))}

                    {/* Missing skills */}
                    {app.missingSkills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 text-3xs"
                      >
                        <span>Kurang: {s}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Cover letter / Application Message */}
                {app.message && (
                  <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 text-xs text-slate-700 space-y-1">
                    <div className="flex items-center gap-1.5 text-2xs font-semibold text-purple-900 uppercase tracking-wider">
                      <MessageSquare className="h-3 w-3 text-purple-600" />
                      <span>Pesan Singkat Pelamar:</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap text-slate-800">{app.message}</p>
                  </div>
                )}

                {/* Bottom Actions Row: Accept, Reject, Mark Completed, View Detail */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDetailApplicant(app)}
                    className="text-xs gap-1.5 h-8 font-semibold text-slate-700"
                  >
                    <Eye className="h-3.5 w-3.5 text-purple-600" />
                    <span>Lihat Profil Lengkap & Portofolio</span>
                  </Button>

                  <div className="flex items-center gap-2">
                    {/* Status: Pending -> Terima atau Tolak */}
                    {app.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleStatusChange(app.id, "accepted")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 gap-1.5 font-bold shadow-xs"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Terima Pelamar</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleStatusChange(app.id, "rejected")}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 text-xs h-8 px-3 gap-1.5 font-medium"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Tolak</span>
                        </Button>
                      </>
                    )}

                    {/* Status: Accepted -> Tandai Selesai */}
                    {app.status === "accepted" && (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleStatusChange(app.id, "completed")}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 gap-1.5 font-semibold shadow-xs"
                      >
                        <FolderCheck className="h-3.5 w-3.5" />
                        <span>Tandai Selesai</span>
                      </Button>
                    )}

                    {/* Status: Completed -> Beri Penilaian atau Lihat Penilaian */}
                    {app.status === "completed" && (
                      app.review ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReviewApplicant(app)}
                          className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs h-8 px-3 gap-1.5 font-semibold"
                        >
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                          <span>Sudah Dinilai ({app.review.rating}★)</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setReviewApplicant(app)}
                          className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-8 px-3 gap-1.5 font-bold shadow-xs"
                        >
                          <Star className="h-3.5 w-3.5 fill-white text-white" />
                          <span>Beri Penilaian</span>
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 text-purple-600">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Belum Ada Pelamar Masuk</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Proyek ini belum menerima lamaran. Pastikan status proyek adalah &ldquo;Open&rdquo; agar talenta muda dapat menemukan dan mengajukan diri.
          </p>
        </div>
      )}

      {/* Compare Modal */}
      <ApplicantCompareModal
        applicants={selectedApplicants}
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        onStatusChange={(appId, status) => {
          handleStatusChange(appId, status);
          setIsCompareOpen(false);
        }}
      />

      {/* Full Detail Modal */}
      <ApplicantDetailModal
        applicant={detailApplicant}
        isOpen={detailApplicant !== null}
        onClose={() => setDetailApplicant(null)}
        onOpenReview={(app) => {
          setDetailApplicant(null);
          setReviewApplicant(app);
        }}
      />

      {/* Review Dialog */}
      {reviewApplicant && (
        <ReviewApplicantDialog
          isOpen={reviewApplicant !== null}
          onClose={() => setReviewApplicant(null)}
          applicationId={reviewApplicant.id}
          talentName={reviewApplicant.talentName}
          projectTitle={projectTitle || "Proyek"}
          existingReview={reviewApplicant.review}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
