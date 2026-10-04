"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchScoreBadge } from "@/components/talent/match-score-badge";
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  Star,
  ExternalLink,
  Mail,
  Scale,
} from "lucide-react";
import type { DetailedApplicantItem } from "@/app/vendor/projects/[id]/applicants/actions";

interface ApplicantCompareModalProps {
  applicants: DetailedApplicantItem[];
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (applicationId: string, newStatus: "accepted" | "rejected") => void;
}

export function ApplicantCompareModal({
  applicants,
  isOpen,
  onClose,
  onStatusChange,
}: ApplicantCompareModalProps) {
  if (applicants.length < 2) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto bg-white rounded-2xl p-6 space-y-6">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-purple-700 font-semibold text-xs uppercase tracking-wider">
            <Scale className="h-4 w-4" />
            <span>Perbandingan Pelamar Berdampingan</span>
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Bandingkan {applicants.length} Pelamar Pilihan
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Tinjau perbedaan kompetensi, ketersediaan, dan rekam jejak untuk memilih talenta terbaik untuk proyekmu.
          </DialogDescription>
        </DialogHeader>

        {/* Comparison Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-3 px-3 text-slate-500 font-semibold uppercase text-3xs w-1/4">
                  Kriteria
                </th>
                {applicants.map((app) => (
                  <th key={app.id} className="py-3 px-3 w-1/3 min-w-[200px] align-top">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          fallback={app.talentName}
                          className="h-10 w-10 text-sm font-bold bg-purple-100 text-purple-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm truncate">
                            {app.talentName}
                          </h4>
                          <span className="text-3xs text-purple-700 font-semibold flex items-center gap-1 truncate">
                            <Mail className="h-2.5 w-2.5" />
                            {app.contactEmail || "Email tersimpan"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MatchScoreBadge score={app.latestMatchScore} size="sm" />
                        <Badge variant="outline" className="text-3xs capitalize">
                          {app.status}
                        </Badge>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {/* Row 1: Match Score Breakdown */}
              <tr className="bg-slate-50/60">
                <td colSpan={applicants.length + 1} className="py-2 px-3 font-bold text-slate-700 text-3xs uppercase tracking-wider">
                  Rincian Komponen Skor
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-500">Kecocokan Skill (50%)</td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-2.5 px-3 font-bold text-slate-900">
                    {app.matchBreakdown.skill}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-500">Kesesuaian Level (20%)</td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-2.5 px-3 font-bold text-slate-900">
                    {app.matchBreakdown.levelFit}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-500">Ketersediaan & Mode (15%)</td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-2.5 px-3 font-bold text-slate-900">
                    {app.matchBreakdown.availability}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-500">Rating & Rekam Jejak (15%)</td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-2.5 px-3 font-bold text-slate-900">
                    {app.matchBreakdown.rating}%
                  </td>
                ))}
              </tr>

              {/* Row 2: Skill Fit Overview */}
              <tr className="bg-slate-50/60">
                <td colSpan={applicants.length + 1} className="py-2 px-3 font-bold text-slate-700 text-3xs uppercase tracking-wider">
                  Analisis Keahlian
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-500">Keahlian Cocok</td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-2.5 px-3 align-top">
                    {app.matchedSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {app.matchedSkills.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-3xs font-semibold"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-3xs">Tidak ada</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-500">Perlu Peningkatan Level</td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-2.5 px-3 align-top">
                    {app.underLevelSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {app.underLevelSkills.map((s) => (
                          <span
                            key={s.name}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-3xs font-medium"
                          >
                            <TrendingUp className="h-2.5 w-2.5 text-amber-600" />
                            {s.name} ({s.has} → butuh {s.needs})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-emerald-700 text-3xs font-medium">Sesuai standar</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-500">Keahlian Kurang</td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-2.5 px-3 align-top">
                    {app.missingSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {app.missingSkills.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-3xs"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-emerald-700 text-3xs font-medium">Lengkap</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Row 3: Reputation & Experience */}
              <tr className="bg-slate-50/60">
                <td colSpan={applicants.length + 1} className="py-2 px-3 font-bold text-slate-700 text-3xs uppercase tracking-wider">
                  Reputasi & Pengalaman
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-500">Rating Rata-rata</td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-2.5 px-3">
                    <div className="flex items-center gap-1 font-bold text-slate-900">
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                      <span>{app.avgRating !== null ? app.avgRating.toFixed(1) : "3.0"}</span>
                      <span className="text-slate-400 font-normal">({app.reviewCount} ulasan)</span>
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-500">Proyek Selesai</td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-2.5 px-3 font-bold text-slate-800">
                    {app.completedProjectsCount} proyek
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-500">Link Portofolio</td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-2.5 px-3">
                    {app.portfolioUrls.length > 0 ? (
                      <div className="space-y-1">
                        {app.portfolioUrls.slice(0, 2).map((url, i) => (
                          <a
                            key={i}
                            href={url.startsWith("http") ? url : `https://${url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-purple-700 hover:underline text-3xs truncate max-w-[180px]"
                          >
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{url}</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-3xs">-</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Row 4: Availability */}
              <tr className="bg-slate-50/60">
                <td colSpan={applicants.length + 1} className="py-2 px-3 font-bold text-slate-700 text-3xs uppercase tracking-wider">
                  Ketersediaan Kerja
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-500">Jam per Minggu</td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-2.5 px-3 font-medium text-slate-800">
                    {app.hoursPerWeek ? `${app.hoursPerWeek} jam/mgg` : "Fleksibel"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-500">Preferensi Mode</td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-2.5 px-3 font-medium text-slate-800 capitalize">
                    {app.preferredMode || "Semua Mode (Fleksibel)"}
                  </td>
                ))}
              </tr>

              {/* Row 5: Quick Decision Actions */}
              <tr className="bg-slate-50/90">
                <td className="py-3 px-3 font-bold text-slate-700 uppercase text-3xs">
                  Aksi Keputusan
                </td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      {app.status !== "accepted" ? (
                        <Button
                          size="sm"
                          onClick={() => onStatusChange(app.id, "accepted")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-3xs h-7 px-2.5 gap-1 font-semibold"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Terima</span>
                        </Button>
                      ) : (
                        <span className="text-emerald-700 font-bold text-3xs flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Diterima
                        </span>
                      )}

                      {app.status !== "rejected" && app.status !== "accepted" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onStatusChange(app.id, "rejected")}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 text-3xs h-7 px-2.5 gap-1"
                        >
                          <XCircle className="h-3 w-3" />
                          <span>Tolak</span>
                        </Button>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
