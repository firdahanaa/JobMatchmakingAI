"use client";

import React, { useTransition } from "react";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchScoreBadge } from "./match-score-badge";
import { withdrawApplication, type TalentApplicationItem } from "@/app/talent/applications/actions";
import type { ApplicationStatus } from "@/types/database";

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
};

export function ApplicationsList({ initialApplications }: ApplicationsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
      {initialApplications.map((app) => {
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
            {/* Top Row: Organization, Status Badge, & Match Score */}
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

              {/* Snapshot Score Badge */}
              <div className="flex items-center gap-2 shrink-0 sm:flex-col sm:items-end">
                {app.matchScore !== null && (
                  <div className="space-y-0.5 sm:text-right">
                    <span className="text-3xs text-slate-400 block font-bold uppercase tracking-wider">Snapshot AI</span>
                    <MatchScoreBadge score={app.matchScore} size="sm" />
                  </div>
                )}
              </div>
            </div>

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
            </div>
          </div>
        );
      })}
    </div>
  );
}
