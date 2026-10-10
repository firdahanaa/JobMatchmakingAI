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
      <div className="rounded-2xl border border-[#e0c4bc] bg-gradient-to-r from-[#F7ECEA] via-[#F9F5DC]/60 to-[#F7ECEA] p-4 sm:p-5 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#F7ECEA] text-[#b87a65] shrink-0 mt-0.5">
            <Info className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-[#5c3a2e] uppercase tracking-wider">
              Panduan Penilaian Seleksi Vendor
            </h4>
            <p className="text-sm font-semibold text-[#7a4f3f] leading-snug">
              &ldquo;Match score adalah indikator bantuan, keputusan akhir ada di tanganmu.&rdquo;
            </p>
            <p className="text-2xs text-[#b87a65] leading-relaxed">
              Skor kecocokan dihitung secara transparan berdasarkan perbandingan profil keahlian talenta dengan kebutuhan proyek. Gunakan fitur perbandingan untuk meninjau kecakapan secara mendalam.
            </p>
          </div>
        </div>
      </div>

      {/* Action & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e8d5d0] shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#695449]">
          <Users className="h-4 w-4 text-[#C98B75]" />
          <span>Total {initialApplicants.length} Pelamar Masuk</span>
          <span className="text-[#d4b0a5]">•</span>
          <span className="text-2xs font-normal text-[#8a7668]">
            Terurut real-time skor kecocokan gabungan tertinggi
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
                ? "bg-[#C98B75] hover:bg-[#b87a65] text-white shadow-xs"
                : "bg-[#F7ECEA] text-[#a89080] cursor-not-allowed hover:bg-[#F7ECEA]"
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
              className="text-2xs text-[#8a7668] hover:text-[#5c4639] h-9 px-2"
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
                    ? "border-[#C98B75] ring-2 ring-[#C98B75]/10 shadow-sm"
                    : "border-[#e8d5d0] hover:border-[#e0c4bc]"
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
                        className="h-4 w-4 rounded border-[#d4b0a5] text-[#C98B75] focus:ring-[#C98B75] cursor-pointer"
                        title="Pilih untuk dibandingkan (2-3 pelamar)"
                      />
                    </div>

                    <Avatar
                      fallback={app.talentName}
                      className="h-12 w-12 text-base font-bold bg-[#F7ECEA] text-[#b87a65] shrink-0"
                    />

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-[#4a3728] text-base truncate">
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
                        <p className="text-xs font-medium text-[#7a6559] line-clamp-1">
                          {app.headline}
                        </p>
                      )}

                      {/* Privasi: Email talent hanya terlihat oleh vendor setelah talent melamar (Requirement 10) */}
                      <div className="flex items-center gap-1.5 text-xs text-[#b87a65] font-semibold pt-0.5">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {app.contactEmail ? app.contactEmail : "Email tersimpan di akun pelamar"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Match Score Badge (Real-time Recalculated) */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F7ECEA]">
                    <div className="text-3xs text-[#a89080] font-semibold uppercase">
                      Match Score (Terbaru)
                    </div>
                    <MatchScoreBadge score={app.latestMatchScore} size="md" />
                    <div className="text-3xs text-[#8a7668] font-semibold">
                      Similarity teks {app.textSimilarityScore}%
                    </div>
                  </div>
                </div>

                {/* Metrics Strip: Rating, Selesai, Jam Kerja, Mode */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#F7ECEA] text-xs">
                  <div className="p-2 rounded-xl bg-[#F7ECEA] border border-[#F7ECEA] flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    <div className="truncate">
                      <span className="text-3xs text-[#a89080] block font-semibold uppercase">Rating</span>
                      <span className="font-bold text-[#5c4639]">
                        {app.avgRating !== null ? `${app.avgRating.toFixed(1)} / 5.0` : "Baru (3.0)"}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-[#F7ECEA] border border-[#F7ECEA] flex items-center gap-2">
                    <FolderCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <span className="text-3xs text-[#a89080] block font-semibold uppercase">Proyek Selesai</span>
                      <span className="font-bold text-[#5c4639]">{app.completedProjectsCount} Proyek</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-[#F7ECEA] border border-[#F7ECEA] flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <div className="truncate">
                      <span className="text-3xs text-[#a89080] block font-semibold uppercase">Ketersediaan</span>
                      <span className="font-bold text-[#5c4639]">
                        {app.hoursPerWeek ? `${app.hoursPerWeek} jam/mgg` : "Fleksibel"}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-[#F7ECEA] border border-[#F7ECEA] flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-[#C98B75] shrink-0" />
                    <div className="truncate">
                      <span className="text-3xs text-[#a89080] block font-semibold uppercase">Preferensi Mode</span>
                      <span className="font-bold text-[#5c4639] capitalize">
                        {app.preferredMode || "Semua Mode"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Skill Match Overview */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-2xs font-semibold text-[#8a7668] uppercase tracking-wider mr-1">
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
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F7ECEA] text-[#8a7668] border border-[#e8d5d0] text-3xs"
                      >
                        <span>Kurang: {s}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Cover letter / Application Message */}
                {app.message && (
                  <div className="p-3.5 rounded-xl bg-[#F7ECEA]/50 border border-[#F7ECEA] text-xs text-[#695449] space-y-1">
                    <div className="flex items-center gap-1.5 text-2xs font-semibold text-[#7a4f3f] uppercase tracking-wider">
                      <MessageSquare className="h-3 w-3 text-[#C98B75]" />
                      <span>Pesan Singkat Pelamar:</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap text-[#5c4639]">{app.message}</p>
                  </div>
                )}

                {/* Bottom Actions Row: Accept, Reject, Mark Completed, View Detail */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F7ECEA]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDetailApplicant(app)}
                    className="text-xs gap-1.5 h-8 font-semibold text-[#695449]"
                  >
                    <Eye className="h-3.5 w-3.5 text-[#C98B75]" />
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
                        className="bg-[#D4B980] hover:bg-[#b89e5e] text-white text-xs h-8 px-3 gap-1.5 font-semibold shadow-xs"
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
        <div className="rounded-2xl border border-dashed border-[#d4b0a5] bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F7ECEA] text-[#C98B75]">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="font-bold text-[#4a3728] text-base">Belum Ada Pelamar Masuk</h3>
          <p className="text-xs text-[#8a7668] max-w-sm mx-auto leading-relaxed">
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
