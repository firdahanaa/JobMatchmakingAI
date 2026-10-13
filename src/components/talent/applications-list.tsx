"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  MessageSquare,
  AlertCircle,
  XCircle,
  CheckCircle2,
  Briefcase,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createApplicationDocumentSignedUrl,
  withdrawApplication,
  type ApplicationDocumentKind,
  type TalentApplicationItem,
} from "@/app/talent/applications/actions";
import { SubmitWorkDialog } from "./submit-work-dialog";
import type { ApplicationStatus, PaymentStatus } from "@/types/database";
import { getPaymentStatusBadge, PAYMENT_STATUSES } from "@/lib/workflow/transitions";

interface ApplicationsListProps {
  initialApplications: TalentApplicationItem[];
}

const statusConfig: Record<
  ApplicationStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"; desc: string }
> = {
  pending: {
    label: "Menunggu Review",
    variant: "warning",
    desc: "Lamaranmu telah diterima sistem dan sedang ditinjau oleh pihak vendor.",
  },
  accepted: {
    label: "Diterima (Accepted)",
    variant: "success",
    desc: "Selamat! Vendor telah menerima lamaranmu untuk mengerjakan proyek ini.",
  },
  rejected: {
    label: "Belum Sesuai",
    variant: "destructive",
    desc: "Vendor memilih kandidat lain untuk proyek ini. Jangan patah semangat, coba proyek lainnya!",
  },
  completed: {
    label: "Proyek Selesai",
    variant: "default",
    desc: "Proyek telah selesai dikerjakan.",
  },
  withdrawn: {
    label: "Dibatalkan",
    variant: "secondary",
    desc: "Lamaran telah kamu batalkan secara mandiri.",
  },
  submitted: {
    label: "Hasil Terkirim",
    variant: "outline",
    desc: "Dokumentasi hasil pengerjaanmu telah terkirim dan sedang ditinjau oleh pihak vendor.",
  },
  approved: {
    label: "Hasil Disetujui",
    variant: "default",
    desc: "Vendor telah menyetujui hasil pengerjaanmu. Menunggu penyelesaian akhir proyek/pembayaran.",
  },
};

export function ApplicationsList({ initialApplications }: ApplicationsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "all">("all");
  const [submissionApplication, setSubmissionApplication] = useState<TalentApplicationItem | null>(null);
  const [revisionApplicationId, setRevisionApplicationId] = useState<string | null>(null);

  const handleWithdraw = (applicationId: string, projectTitle: string) => {
    if (!confirm(`Apakah kamu yakin ingin membatalkan lamaran untuk "${projectTitle}"?`)) {
      return;
    }

    startTransition(async () => {
      const res = await withdrawApplication(applicationId);
      if (res.success) {
        toast.success("Lamaran berhasil dibatalkan.");
        router.refresh();
      } else {
        toast.error(res.error || "Gagal membatalkan lamaran.");
      }
    });
  };

  const handleDownloadDocument = async (applicationId: string, kind: ApplicationDocumentKind) => {
    const result = await createApplicationDocumentSignedUrl(applicationId, kind);
    if (!result.signedUrl) {
      toast.error(result.error || "Gagal membuat tautan dokumen.");
      return;
    }
    window.location.assign(result.signedUrl);
  };

  const filteredApplications = initialApplications.filter(
    (application) =>
      (statusFilter === "all" || application.status === statusFilter) &&
      (paymentFilter === "all" || application.paymentStatus === paymentFilter)
  );

  if (initialApplications.length === 0) {
    return (
      <div
        className="rounded-3xl p-12 text-center space-y-4 shadow-xl backdrop-blur-xl"
        style={{
          background: "rgba(255, 255, 255, 0.75)",
          border: "1px solid rgba(186, 230, 253, 0.7)",
        }}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 border border-sky-200/80">
          <Briefcase className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h3 className="font-black text-[#0F172A] text-base">
            Belum Ada Lamaran yang Dikirimkan
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
            Kamu belum melamar ke proyek mana pun. Temukan proyek yang sesuai dengan keahlianmu dan kirimkan lamaran sekarang!
          </p>
        </div>
        <div className="pt-2">
          <Link href="/talent/projects">
            <Button className="bg-gradient-to-r from-[#0284C7] to-[#2563EB] hover:from-[#0369A1] hover:to-[#1D4ED8] text-white text-xs gap-2 font-bold h-10 px-4 rounded-2xl shadow-md shadow-sky-500/20">
              <span>Jelajahi Proyek Tersedia</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-sky-100 bg-white p-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1.5 text-xs font-semibold text-slate-600">
          Status lamaran
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ApplicationStatus | "all")}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
          >
            <option value="all">Semua status</option>
            {Object.entries(statusConfig).map(([status, config]) => (
              <option key={status} value={status}>{config.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-xs font-semibold text-slate-600">
          Status pembayaran
          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value as PaymentStatus | "all")}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
          >
            <option value="all">Semua pembayaran</option>
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>{getPaymentStatusBadge(status).label}</option>
            ))}
          </select>
        </label>
        <span className="text-xs text-slate-500">{filteredApplications.length} lamaran</span>
      </div>

      {filteredApplications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sky-200 bg-white p-8 text-center text-sm text-slate-500">
          Tidak ada lamaran yang sesuai dengan filter ini.
        </div>
      ) : filteredApplications.map((app) => {
        const conf = statusConfig[app.status] || {
          label: app.status,
          variant: "secondary" as const,
          desc: "",
        };

        const formattedReward =
          app.rewardAmount && app.rewardAmount > 0
            ? new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }).format(app.rewardAmount)
            : app.type === "volunteer"
            ? "Sukarela (Volunteer)"
            : "Sesuai Kesepakatan";

        const formattedDate = new Date(app.createdAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        return (
          <div
            key={app.id}
            className="rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl transition-all space-y-4"
            style={{
              background: "rgba(255, 255, 255, 0.75)",
              border: "1px solid rgba(186, 230, 253, 0.7)",
              boxShadow: "0 10px 30px -10px rgba(2, 136, 209, 0.08)",
            }}
          >
            {/* Top Row: Organization and Status */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Building2 className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                  <span className="truncate text-slate-700">{app.vendorName}</span>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-sky-500" />
                    <span>Melamar pada {formattedDate}</span>
                  </div>
                </div>

                <Link href={`/talent/projects/${app.projectId}`}>
                  <h3 className="text-lg font-black text-[#0F172A] hover:text-sky-600 transition-colors line-clamp-1">
                    {app.projectTitle}
                  </h3>
                </Link>

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <Badge variant={conf.variant} className="text-2xs font-extrabold px-2.5 py-0.5 capitalize">
                    {conf.label}
                  </Badge>
                  <Badge variant={getPaymentStatusBadge(app.paymentStatus).variant} className="text-2xs font-semibold px-2.5 py-0.5">
                    {getPaymentStatusBadge(app.paymentStatus).label}
                  </Badge>
                  <Badge variant="outline" className="text-2xs capitalize border-sky-200 text-slate-600">
                    {app.difficulty}
                  </Badge>
                  <Badge variant="outline" className="text-2xs capitalize border-sky-200 text-slate-600">
                    {app.type}
                  </Badge>
                  <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-sky-50/80 text-sky-800 border border-sky-200/80 capitalize">
                    {app.mode}
                  </span>
                  <span className="text-2xs text-sky-700 font-extrabold pl-1">
                    {formattedReward}
                  </span>
                </div>
              </div>

            </div>

            {app.revisionNotes && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRevisionApplicationId((current) => current === app.id ? null : app.id)}
                  className="h-auto px-0 text-xs font-bold text-amber-800 hover:bg-transparent"
                >
                  {revisionApplicationId === app.id ? "Tutup catatan revisi" : "Lihat catatan revisi"}
                </Button>
                {revisionApplicationId === app.id && (
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-amber-950">{app.revisionNotes}</p>
                )}
              </div>
            )}

            {app.submissionLinks.length > 0 && (
              <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-xs text-slate-700">
                <p className="mb-1 font-semibold">Link hasil terkirim:</p>
                <ul className="space-y-1">
                  {app.submissionLinks.filter((link) => /^https?:\/\//i.test(link)).map((link, index) => (
                    <li key={`${app.id}-result-${index}`}>
                      <a href={link} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-sky-700 underline">Buka link hasil {index + 1}</a>
                    </li>
                  ))}
                </ul>
                {app.submissionNotes && <p className="mt-1 whitespace-pre-wrap">{app.submissionNotes}</p>}
              </div>
            )}

            {/* Status description notice */}
            <div className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
              app.status === "accepted"
                ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                : app.status === "rejected"
                ? "bg-rose-50 text-rose-900 border border-rose-200"
                : app.status === "pending"
                ? "bg-amber-50 text-amber-900 border border-amber-200"
                : "bg-sky-50 text-sky-900 border border-sky-200"
            }`}>
              {app.status === "accepted" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : app.status === "pending" ? (
                <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 leading-relaxed">
                <span className="font-extrabold block">{conf.label}:</span>
                <p className="text-xs text-slate-600">{conf.desc}</p>
              </div>
            </div>

            {/* Applicant's message if provided */}
            {app.message && (
              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 text-xs text-slate-700 space-y-1">
                <span className="text-2xs font-extrabold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3 text-sky-600" />
                  Pesan yang Kamu Kirimkan:
                </span>
                <p className="leading-relaxed whitespace-pre-wrap">{app.message}</p>
              </div>
            )}

            {(app.cvPath || app.portfolioPath) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold text-slate-600">Lampiranmu:</span>
                {app.cvPath && (
                  <Button type="button" variant="outline" size="sm" onClick={() => handleDownloadDocument(app.id, "cv")} className="h-8 gap-1.5 text-xs">
                    <Download className="h-3.5 w-3.5" /> CV
                  </Button>
                )}
                {app.portfolioPath && (
                  <Button type="button" variant="outline" size="sm" onClick={() => handleDownloadDocument(app.id, "portfolio")} className="h-8 gap-1.5 text-xs">
                    <Download className="h-3.5 w-3.5" /> Portofolio
                  </Button>
                )}
              </div>
            )}

            {/* Bottom Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-sky-100">
              <Link href={`/talent/projects/${app.projectId}`}>
                <span className="group inline-flex min-h-11 items-center rounded-full bg-gradient-to-r from-sky-600 to-blue-600 px-5 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:from-sky-700 hover:to-blue-700 hover:shadow-lg hover:shadow-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2">
                  <span>Lihat Detail Proyek</span>
                </span>
              </Link>

              {app.status === "pending" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleWithdraw(app.id, app.projectTitle)}
                  disabled={isPending}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 h-8.5 gap-1.5 font-bold rounded-xl"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Batalkan Lamaran</span>
                </Button>
              )}
              {app.status === "accepted" && (
                <Button size="sm" onClick={() => setSubmissionApplication(app)} disabled={isPending} className="gap-1.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Kirim hasil
                </Button>
              )}
              {app.status === "completed" && app.hasReview && (
                <a href={`/talent/applications/${encodeURIComponent(app.id)}/certificate`}>
                  <Button size="sm" type="button" className="gap-1.5 text-xs">
                    <Download className="h-3.5 w-3.5" />
                    Unduh sertifikat
                  </Button>
                </a>
              )}
              {app.status === "completed" && !app.hasReview && (
                <span className="text-xs text-slate-500">Sertifikat tersedia setelah vendor memberi rating.</span>
              )}
            </div>
          </div>
        );
      })}

      {submissionApplication && (
        <SubmitWorkDialog
          applicationId={submissionApplication.id}
          projectTitle={submissionApplication.projectTitle}
          isOpen={true}
          onClose={() => setSubmissionApplication(null)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
