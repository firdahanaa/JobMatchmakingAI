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
} from "lucide-react";
import type { DetailedApplicantItem } from "@/app/vendor/projects/[id]/applicants/actions";

interface ApplicantDetailModalProps {
  applicant: DetailedApplicantItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ApplicantDetailModal({
  applicant,
  isOpen,
  onClose,
}: ApplicantDetailModalProps) {
  if (!applicant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-2xl p-6 space-y-5">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <Avatar
                fallback={applicant.talentName}
                className="h-14 w-14 text-lg font-bold bg-purple-100 text-purple-700 shrink-0"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold text-slate-900">
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
                  <p className="text-xs font-medium text-slate-600">
                    {applicant.headline}
                  </p>
                )}

                {/* Privasi: Email talent hanya terlihat oleh vendor setelah melamar */}
                <div className="flex items-center gap-1.5 text-xs text-purple-700 font-semibold pt-0.5">
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
              <div className="text-3xs text-slate-400 font-semibold uppercase">
                Skor Kecocokan (Real-time)
              </div>
              <MatchScoreBadge score={applicant.latestMatchScore} size="md" />
            </div>
          </div>
        </DialogHeader>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-3xs text-slate-400 block font-semibold uppercase">
              Pendidikan
            </span>
            <div className="flex items-center gap-1 font-semibold text-slate-800 mt-0.5 truncate">
              <GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{applicant.education || "-"}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-3xs text-slate-400 block font-semibold uppercase">
              Lokasi
            </span>
            <div className="flex items-center gap-1 font-semibold text-slate-800 mt-0.5 truncate">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{applicant.location || "-"}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-3xs text-slate-400 block font-semibold uppercase">
              Ketersediaan Jam
            </span>
            <div className="flex items-center gap-1 font-semibold text-slate-800 mt-0.5 truncate">
              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {applicant.hoursPerWeek ? `${applicant.hoursPerWeek} jam/mgg` : "Fleksibel"}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-3xs text-slate-400 block font-semibold uppercase">
              Rating & Selesai
            </span>
            <div className="flex items-center gap-1 font-semibold text-slate-800 mt-0.5 truncate">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
              <span>
                {applicant.avgRating !== null ? applicant.avgRating.toFixed(1) : "3.0"}
              </span>
              <span className="text-slate-400">({applicant.completedProjectsCount} selesai)</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {applicant.bio && (
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-slate-800">Tentang Talenta</h4>
            <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
              {applicant.bio}
            </p>
          </div>
        )}

        {/* Message from talent */}
        {applicant.message && (
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
              <span>Pesan Lamaran</span>
            </h4>
            <p className="text-slate-700 bg-purple-50/50 border border-purple-100 p-3 rounded-xl leading-relaxed whitespace-pre-wrap">
              {applicant.message}
            </p>
          </div>
        )}

        {/* Skills section */}
        <div className="space-y-2 text-xs">
          <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-purple-600" />
            <span>Keahlian & Level Penguasaan ({applicant.allTalentSkills.length})</span>
          </h4>
          {applicant.allTalentSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {applicant.allTalentSkills.map((s) => (
                <div
                  key={s.skillId}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                >
                  <span className="font-medium text-slate-800">{s.name}</span>
                  <Badge variant="secondary" className="text-3xs capitalize px-1.5 py-0 h-4">
                    {s.level}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 italic">Talenta belum mendaftarkan keahlian spesifik.</p>
          )}
        </div>

        {/* Portfolio URLs */}
        {applicant.portfolioUrls && applicant.portfolioUrls.length > 0 && (
          <div className="space-y-1.5 text-xs">
            <h4 className="font-bold text-slate-800">Portofolio & Tautan Karya</h4>
            <div className="flex flex-wrap gap-2">
              {applicant.portfolioUrls.map((url, idx) => (
                <a
                  key={idx}
                  href={url.startsWith("http") ? url : `https://${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-medium transition-colors"
                >
                  <span className="truncate max-w-[220px]">{url}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Reviews History */}
        <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
          <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            <span>Riwayat Ulasan Vendor ({applicant.reviews.length})</span>
          </h4>

          {applicant.reviews.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {applicant.reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between text-2xs">
                    <span className="font-semibold text-slate-700">
                      {rev.vendorName}
                    </span>
                    <div className="flex items-center gap-1 font-bold text-amber-700">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span>{rev.rating} / 5</span>
                    </div>
                  </div>
                  {rev.comment && (
                    <p className="text-slate-600 text-2xs italic leading-relaxed">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 italic">Belum ada riwayat ulasan dari proyek sebelumnya.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
