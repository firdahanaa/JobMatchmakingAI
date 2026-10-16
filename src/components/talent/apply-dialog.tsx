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
  Plus,
  Trash2,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { applyToProject, withdrawApplication } from "@/app/talent/applications/actions";
import {
  applicationAttachmentsSchema,
  applyApplicationSchema,
} from "@/lib/validators/application";
import type { ApplicationStatus } from "@/types/database";

interface ApplyDialogProps {
  projectId: string;
  projectTitle: string;
  vendorName: string;
  projectStatus: string;
  portfolioRequired: boolean;
  existingApplication: {
    id: string;
    status: ApplicationStatus;
  } | null;
}

export function ApplyDialog({
  projectId,
  projectTitle,
  vendorName,
  projectStatus,
  portfolioRequired,
  existingApplication,
}: ApplyDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [relatedLinks, setRelatedLinks] = useState<string[]>([""]);
  const [isPending, startTransition] = useTransition();

  const isProjectOpen = projectStatus === "open";
  const hasApplied = existingApplication !== null && existingApplication.status !== "withdrawn";
  const isWithdrawn = existingApplication !== null && existingApplication.status === "withdrawn";

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();

    const links = relatedLinks.map((link) => link.trim()).filter(Boolean);
    const applicationValidation = applyApplicationSchema.safeParse({ message, relatedLinks: links });
    if (!applicationValidation.success) {
      toast.error(applicationValidation.error.issues[0]?.message || "Periksa data lamaran.");
      return;
    }
    const attachmentsValidation = applicationAttachmentsSchema.safeParse({
      cv: cvFile,
      portfolio: portfolioFile,
    });
    if (!attachmentsValidation.success) {
      toast.error(attachmentsValidation.error.issues[0]?.message || "Lampiran belum lengkap.");
      return;
    }
    if (portfolioRequired && !portfolioFile) {
      toast.error("Proyek ini mewajibkan dokumen portofolio PDF.");
      return;
    }

    const formData = new FormData();
    formData.set("message", applicationValidation.data.message || "");
    formData.set("relatedLinks", JSON.stringify(applicationValidation.data.relatedLinks));
    formData.set("cv", attachmentsValidation.data.cv);
    if (attachmentsValidation.data.portfolio) {
      formData.set("portfolio", attachmentsValidation.data.portfolio);
    }

    startTransition(async () => {
      const res = await applyToProject(projectId, formData);
      if (res.success) {
        toast.success("Lamaran berhasil dikirimkan ke vendor!", {
          description: "Kamu dapat memantau status lamaran di menu 'Lamaran Saya'.",
        });
        setIsOpen(false);
        setMessage("");
        setCvFile(null);
        setPortfolioFile(null);
        setRelatedLinks([""]);
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
            </div>
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
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-2xl p-6">
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
              profil, dokumen lamaran, dan link terkait yang kamu sertakan.
            </DialogDescription>
          </DialogHeader>

          <section className="space-y-4 rounded-xl border border-sky-100 bg-sky-50/50 p-4" aria-label="Persyaratan lampiran lamaran">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800">Lampiran Lamaran</h3>
              <p className="text-xs text-slate-600">File harus PDF dan maksimal 5 MB.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="application-cv" className="text-xs font-semibold text-slate-700">
                CV / Resume <span className="text-rose-600">Wajib</span>
              </label>
              <Input
                id="application-cv"
                type="file"
                accept="application/pdf,.pdf"
                required
                onChange={(event) => setCvFile(event.target.files?.[0] ?? null)}
                className="text-xs file:mr-3 file:rounded-md file:border-0 file:bg-sky-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-sky-800"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="application-portfolio" className="text-xs font-semibold text-slate-700">
                Dokumen Portofolio {portfolioRequired ? <span className="text-rose-600">Wajib</span> : <span className="text-slate-500">Opsional</span>}
              </label>
              <Input
                id="application-portfolio"
                type="file"
                accept="application/pdf,.pdf"
                required={portfolioRequired}
                onChange={(event) => setPortfolioFile(event.target.files?.[0] ?? null)}
                className="text-xs file:mr-3 file:rounded-md file:border-0 file:bg-sky-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-sky-800"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Link terkait</p>
                  <p className="text-[11px] text-slate-500">Maksimal 5 URL HTTP/HTTPS, opsional.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={relatedLinks.length >= 5}
                  onClick={() => setRelatedLinks((current) => [...current, ""])}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah link
                </Button>
              </div>
              <div className="space-y-2">
                {relatedLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="url"
                      inputMode="url"
                      value={link}
                      onChange={(event) =>
                        setRelatedLinks((current) =>
                          current.map((value, row) => (row === index ? event.target.value : value))
                        )
                      }
                      placeholder="https://contoh.com/portofolio"
                      aria-label={`Link terkait ${index + 1}`}
                      className="h-9 text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={relatedLinks.length === 1}
                      onClick={() => setRelatedLinks((current) => current.filter((_, row) => row !== index))}
                      aria-label={`Hapus link terkait ${index + 1}`}
                      className="h-9 w-9 shrink-0 text-slate-500 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </section>

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
