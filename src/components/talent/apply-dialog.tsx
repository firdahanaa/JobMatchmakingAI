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
import { applyToProject, withdrawApplication } from "@/app/talent/applications/actions";
import type { ApplicationStatus } from "@/types/database";

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
  } | null;
}

export function ApplyDialog({
  projectId,
  projectTitle,
  vendorName,
  projectStatus,
  currentMatchScore,
  existingApplication,
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
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center space-y-1">
        <span className="text-xs font-semibold text-slate-700 block">
          Pendaftaran Lamaran Ditutup
        </span>
        <p className="text-2xs text-slate-500">
          Proyek ini sedang berstatus &ldquo;{projectStatus}&rdquo; dan sudah tidak menerima lamaran baru.
        </p>
      </div>
    );
  }

  // State 2: Talent sudah melamar dan status masih aktif
  if (hasApplied && existingApplication) {
    const status = existingApplication.status;

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-900 block">
              Status Lamaran Kamu:
            </span>
            <div className="flex items-center gap-2">
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
                  ? "Menunggu Review Vendor"
                  : status === "accepted"
                  ? "Diterima (Accepted)"
                  : status === "rejected"
                  ? "Belum Sesuai (Rejected)"
                  : status === "completed"
                  ? "Proyek Selesai"
                  : status}
              </Badge>
              {existingApplication.matchScore !== null && (
                <span className="text-2xs text-slate-500 font-medium">
                  (Snapshot: {Math.round(existingApplication.matchScore)}%)
                </span>
              )}
            </div>
          </div>

          <Link href="/talent/applications">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
              <FileText className="h-3.5 w-3.5 text-purple-600" />
              <span>Lihat di Lamaran Saya</span>
            </Button>
          </Link>
        </div>

        {status === "pending" && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
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
        className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white gap-2 text-xs font-bold px-6 h-11 shadow-sm"
      >
        {isWithdrawn ? (
          <>
            <RotateCcw className="h-4 w-4" />
            <span>Lamar Kembali Proyek Ini</span>
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            <span>Lamar Proyek Ini Sekarang</span>
          </>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl p-6">
          <form onSubmit={handleApply} className="space-y-4">
          <DialogHeader className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-2xs font-semibold w-fit">
              <Sparkles className="h-3 w-3" />
              Konfirmasi Pengiriman Lamaran
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 leading-snug">
              {projectTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pihak vendor <strong className="text-slate-700">{vendorName}</strong> akan menerima
              profil keahlianmu, link portofolio, dan snapshot skor kecocokan saat ini.
            </DialogDescription>
          </DialogHeader>

          {/* Snapshot Info Card */}
          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-2xs text-purple-800 font-semibold block uppercase tracking-wider">
                Snapshot Match Score Saat Ini
              </span>
              <span className="text-sm font-extrabold text-purple-950">
                {currentMatchScore}% Match
              </span>
            </div>
            <span className="text-3xs text-purple-700 max-w-[200px] text-right">
              Dihitung otomatis di server berdasarkan profil & kebutuhan skill proyek.
            </span>
          </div>

          {/* Short Message Input (Optional, max 500 chars) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="apply-message" className="font-semibold text-slate-800">
                Pesan Singkat untuk Vendor <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <span
                className={`text-2xs font-mono ${
                  message.length > 500 ? "text-rose-600 font-bold" : "text-slate-400"
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
              className="text-xs rounded-xl border-slate-200 focus:border-purple-400 resize-none"
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
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold gap-2"
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
