"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Send,
  Sparkles,
  FileText,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  applyToProject,
  withdrawApplication,
  type TalentApplyReadiness,
} from "@/app/talent/applications/actions";
import type { ApplicationStatus, ScreeningStatus } from "@/types/database";

interface ApplyDialogProps {
  projectId: string;
  projectTitle: string;
  vendorName: string;
  projectStatus: string;
  currentMatchScore: number;
  existingApplication: {
    id: string;
    status: ApplicationStatus;
    matchScore: number | null;
    candidateCvFilename?: string | null;
    screeningStatus?: ScreeningStatus;
  } | null;
  readiness?: TalentApplyReadiness;
}

const SCREENING_LABELS: Record<ScreeningStatus, string> = {
  not_started: "Belum Dimulai",
  queued: "Antrean Screening AI",
  processing: "Sedang Dievaluasi AI",
  completed: "Screening Selesai",
  failed: "Screening Gagal",
  needs_review: "Menunggu Tinjauan HR",
};

export function ApplyDialog({
  projectId,
  projectTitle,
  vendorName,
  projectStatus,
  currentMatchScore,
  existingApplication,
  readiness,
}: ApplyDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const isProjectOpen = projectStatus === "open";
  const hasApplied = existingApplication !== null && existingApplication.status !== "withdrawn";
  const isWithdrawn = existingApplication !== null && existingApplication.status === "withdrawn";

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();

    if (message.length > 500) {
      toast.error("Pesan lamaran maksimal 500 karakter.");
      return;
    }

    startTransition(async () => {
      const res = await applyToProject(projectId, message);
      if (res.success) {
        toast.success("Lamaran berhasil dikirimkan ke vendor!", {
          description: "Kamu dapat memantau status lamaran di menu 'Lamaran Saya'.",
        });
        setIsOpen(false);
        setMessage("");
        router.refresh();
      } else {
        toast.error("Gagal mengirimkan lamaran", {
          description: res.error || "Terjadi kesalahan pada sistem.",
        });
      }
    });
  };

  const handleWithdraw = () => {
    if (!existingApplication) return;

    if (!window.confirm("Apakah kamu yakin ingin membatalkan lamaran untuk proyek ini?")) {
      return;
    }

    startTransition(async () => {
      const res = await withdrawApplication(existingApplication.id);
      if (res.success) {
        toast.success("Lamaran berhasil dibatalkan.");
        router.refresh();
      } else {
        toast.error("Gagal membatalkan lamaran", {
          description: res.error || "Terjadi kesalahan.",
        });
      }
    });
  };

  // State 1: Proyek sudah tidak berstatus open
  if (!isProjectOpen) {
    return (
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-center space-y-1">
        <span className="text-xs font-semibold text-sky-900 block">
          Pendaftaran Lamaran Ditutup
        </span>
        <p className="text-2xs text-slate-600">
          Proyek ini sedang berstatus &ldquo;{projectStatus}&rdquo; dan sudah tidak menerima lamaran baru.
        </p>
      </div>
    );
  }

  // State 2: Talent sudah melamar dan status masih aktif
  if (hasApplied && existingApplication) {
    const status = existingApplication.status;

    return (
      <div className="rounded-2xl border border-sky-100 bg-white p-5 space-y-4 shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#0F172A] block">
              Status Lamaran Kamu:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  status === "accepted"
                    ? "success"
                    : status === "rejected"
                    ? "destructive"
                    : status === "completed"
                    ? "default"
                    : "warning"
                }
                className="capitalize text-xs font-semibold px-2.5 py-0.5"
              >
                {status === "pending"
                  ? "Menunggu Review HR"
                  : status === "accepted"
                  ? "Diterima (Accepted)"
                  : status === "rejected"
                  ? "Belum Sesuai (Rejected)"
                  : status === "completed"
                  ? "Proyek Selesai"
                  : status}
              </Badge>
              {existingApplication.screeningStatus && (
                <Badge
                  variant="outline"
                  className="text-2xs font-semibold border-sky-200 bg-sky-50 text-sky-800"
                >
                  Screening: {SCREENING_LABELS[existingApplication.screeningStatus]}
                </Badge>
              )}
              {existingApplication.matchScore !== null && (
                <span className="text-2xs text-slate-500 font-medium">
                  (Snapshot: {Math.round(existingApplication.matchScore)}%)
                </span>
              )}
            </div>
            {existingApplication.candidateCvFilename && (
              <p className="text-2xs text-slate-500 pt-0.5">
                Snapshot CV:{" "}
                <strong className="text-slate-700">
                  {existingApplication.candidateCvFilename}
                </strong>
              </p>
            )}
          </div>

          <Link href="/talent/applications">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
              <FileText className="h-3.5 w-3.5 text-sky-600" />
              <span>Lihat di Lamaran Saya</span>
            </Button>
          </Link>
        </div>

        {status === "pending" && (
          <div className="pt-2 border-t border-sky-100 flex items-center justify-between text-2xs text-slate-500">
            <span>Ingin membatalkan lamaran ini?</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleWithdraw}
              disabled={isPending}
              className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              Batalkan Lamaran
            </Button>
          </div>
        )}
      </div>
    );
  }

  // State 3: Talent belum melamar atau sebelumnya withdrawn (bisa apply)
  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="group w-full min-h-12 justify-start gap-3 rounded-full bg-gradient-to-r from-sky-600 to-blue-600 py-1.5 pl-2 pr-5 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:from-sky-700 hover:to-blue-700 hover:shadow-lg hover:shadow-blue-500/30 sm:w-auto"
      >
        {isWithdrawn ? (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/10">
              <RotateCcw className="h-4 w-4" />
            </span>
            <span>Lamar Kembali Proyek Ini</span>
          </>
        ) : (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/10">
              <Send className="h-4 w-4" />
            </span>
            <span>Lamar Proyek Ini Sekarang</span>
          </>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl p-6">
          <form onSubmit={handleApply} className="space-y-4">
          <DialogHeader className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-2xs font-semibold w-fit">
              <Sparkles className="h-3 w-3" />
              Konfirmasi Pengiriman Lamaran
            </div>
            <DialogTitle className="text-lg font-bold text-[#0F172A] leading-snug">
              {projectTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pihak vendor <strong className="text-slate-700">{vendorName}</strong> akan menerima
              profil keahlianmu, link portofolio, dan snapshot skor kecocokan. CV terbaru ikut
              disertakan jika kamu sudah mengunggahnya.
            </DialogDescription>
          </DialogHeader>

          {/* Snapshot Info Card */}
          <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-2xs text-sky-700 font-semibold block uppercase tracking-wider">
                Snapshot Match Score Saat Ini
              </span>
              <span className="text-sm font-extrabold text-[#0F172A]">
                {currentMatchScore}% Match
              </span>
            </div>
            <span className="text-3xs text-slate-500 max-w-[200px] text-right">
              Dihitung otomatis di server berdasarkan profil & kebutuhan skill lowongan.
            </span>
          </div>

          {/* Current CV Snapshot & Profile Readiness Card */}
          <div className="rounded-2xl border border-sky-100 bg-white p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[#0F172A] flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-sky-600" />
                Snapshot CV yang Disertakan
              </span>
              <Link
                href="/talent/profile"
                className="text-2xs font-bold text-sky-700 hover:underline"
              >
                Kelola CV di Profil
              </Link>
            </div>

            {readiness?.currentCv ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50/70 border border-emerald-200 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="truncate font-semibold text-emerald-950">
                    {readiness.currentCv.originalFilename}
                  </span>
                </div>
                <Badge variant="success" className="text-3xs shrink-0">
                  CV Aktif
                </Badge>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-2xs">Belum ada CV PDF di profilmu</p>
                  <p className="text-3xs text-amber-800">
                    Kamu tetap bisa melamar, namun sangat disarankan mengunggah CV PDF di halaman Profil agar hasil AI Screening lebih optimal.
                  </p>
                </div>
              </div>
            )}

            {readiness && (!readiness.hasHeadlineAndLocation || !readiness.hasSkills) && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50/70 border border-amber-200 px-3 py-2 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-3xs leading-relaxed">
                  Profil atau daftar keahlianmu belum lengkap. Lengkapi di{" "}
                  <Link href="/talent/profile" className="font-bold underline">
                    Profil Saya
                  </Link>{" "}
                  untuk meningkatkan skor evaluasi.
                </p>
              </div>
            )}
          </div>

          {/* Short Message Input (Optional, max 500 chars) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="apply-message" className="font-semibold text-slate-700">
                Pesan Singkat untuk Vendor <span className="text-slate-500 font-normal">(Opsional)</span>
              </label>
              <span
                className={`text-2xs font-mono ${
                  message.length > 500 ? "text-rose-600 font-bold" : "text-slate-500"
                }`}
              >
                {message.length} / 500
              </span>
            </div>
            <Textarea
              id="apply-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              placeholder="Contoh: Halo! Saya sangat tertarik membantu proyek ini karena memiliki pengalaman di bidang desain grafis dan terbiasa menggunakan Figma..."
              rows={4}
              className="text-xs rounded-xl border-sky-200 focus:border-sky-500 resize-none"
            />
            <p className="text-2xs text-slate-500">
              Ceritakan secara singkat motivasi atau pengalaman relevan yang kamu miliki.
            </p>
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending || message.length > 500}
              className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-xs font-semibold gap-2"
            >
              {isPending ? (
                <span>Mengirimkan Lamaran...</span>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Kirim Lamaran Sekarang</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
