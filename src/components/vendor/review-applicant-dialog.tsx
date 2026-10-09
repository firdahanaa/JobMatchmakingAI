"use client";

import React, { useState, useTransition } from "react";
import { Star, MessageSquare, CheckCircle, AlertCircle, X, Sparkles, Award } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { submitApplicantReview } from "@/app/vendor/projects/[id]/applicants/actions";

interface ReviewApplicantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  talentName: string;
  projectTitle: string;
  existingReview?: {
    id: string;
    rating: number;
    quality: number | null;
    timeliness: number | null;
    communication: number | null;
    comment: string | null;
    createdAt: string;
  } | null;
  onSuccess?: () => void;
}

export function ReviewApplicantDialog({
  isOpen,
  onClose,
  applicationId,
  talentName,
  projectTitle,
  existingReview,
  onSuccess,
}: ReviewApplicantDialogProps) {
  const [rating, setRating] = useState<number>(existingReview?.rating ?? 5);
  const [quality, setQuality] = useState<number>(existingReview?.quality ?? 5);
  const [timeliness, setTimeliness] = useState<number>(existingReview?.timeliness ?? 5);
  const [communication, setCommunication] = useState<number>(existingReview?.communication ?? 5);
  const [comment, setComment] = useState<string>(existingReview?.comment ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const isReadOnly = !!existingReview;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!rating || rating < 1 || rating > 5) {
      setErrorMessage("Rating keseluruhan wajib diisi (minimal 1 bintang).");
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const res = await submitApplicantReview({
        applicationId,
        rating,
        quality: quality > 0 ? quality : null,
        timeliness: timeliness > 0 ? timeliness : null,
        communication: communication > 0 ? communication : null,
        comment: comment.trim() || null,
      });

      if (res.success) {
        toast.success(`Penilaian untuk ${talentName} berhasil disimpan!`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const errorText = res.error || "Gagal menyimpan penilaian.";
        setErrorMessage(errorText);
        toast.error(errorText);
      }
    });
  };

  const ratingLabels: Record<number, string> = {
    1: "Perlu Peningkatan Signifikan (1)",
    2: "Cukup Memadai (2)",
    3: "Baik / Sesuai Harapan (3)",
    4: "Sangat Baik (4)",
    5: "Luar Biasa / Sempurna (5)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4a3728]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#e8d5d0] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#F7ECEA] bg-gradient-to-r from-[#F7ECEA] via-[#F9F5DC]/50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#4a3728] text-base">
                {isReadOnly ? "Detail Penilaian Proyek" : "Beri Penilaian Talenta"}
              </h3>
              <p className="text-xs text-[#8a7668]">
                {talentName} • {projectTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#a89080] hover:text-[#7a6559] rounded-lg hover:bg-[#F7ECEA] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isReadOnly && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Penilaian telah diberikan untuk lamaran proyek ini.</span>
            </div>
          )}

          {/* 1. Rating Keseluruhan (Wajib) */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[#4a3728] flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span>Rating Keseluruhan</span>
                <span className="text-rose-500">*</span>
              </Label>
              <span className="text-xs font-bold text-amber-800 tabular-nums">
                {rating > 0 ? ratingLabels[rating] : "Pilih bintang"}
              </span>
            </div>

            <div className="flex items-center justify-center py-2">
              <StarRating
                value={rating}
                onChange={!isReadOnly ? setRating : undefined}
                size="lg"
                readOnly={isReadOnly}
              />
            </div>
            <p className="text-2xs text-center text-[#8a7668]">
              Evaluasi performa umum talenta dalam menyelesaikan deliverable proyek ini.
            </p>
          </div>

          {/* 2. Aspek Penilaian Opsional (Kualitas, Ketepatan Waktu, Komunikasi) */}
          <div className="space-y-3.5 pt-1">
            <h4 className="text-xs font-bold text-[#5c4639] uppercase tracking-wider">
              Aspek Detail (Opsional)
            </h4>

            {/* Kualitas */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7ECEA] border border-[#F7ECEA]">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-[#5c4639]">Kualitas Hasil Kerja</p>
                <p className="text-3xs text-[#8a7668]">Kerapihan dan akurasi tugas</p>
              </div>
              <StarRating
                value={quality}
                onChange={!isReadOnly ? setQuality : undefined}
                size="md"
                readOnly={isReadOnly}
                showValue
              />
            </div>

            {/* Ketepatan Waktu */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7ECEA] border border-[#F7ECEA]">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-[#5c4639]">Ketepatan Waktu</p>
                <p className="text-3xs text-[#8a7668]">Kepatuhan pada deadline</p>
              </div>
              <StarRating
                value={timeliness}
                onChange={!isReadOnly ? setTimeliness : undefined}
                size="md"
                readOnly={isReadOnly}
                showValue
              />
            </div>

            {/* Komunikasi */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7ECEA] border border-[#F7ECEA]">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-[#5c4639]">Komunikasi & Kolaborasi</p>
                <p className="text-3xs text-[#8a7668]">Responsivitas dan profesionalisme</p>
              </div>
              <StarRating
                value={communication}
                onChange={!isReadOnly ? setCommunication : undefined}
                size="md"
                readOnly={isReadOnly}
                showValue
              />
            </div>
          </div>

          {/* 3. Komentar & Ulasan Teks (Opsional) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="review-comment" className="text-xs font-semibold text-[#5c4639] flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-[#C98B75]" />
                <span>Komentar / Ulasan Tertulis</span>
                <span className="text-2xs text-[#a89080] font-normal">(Opsional)</span>
              </Label>
              <span className="text-3xs text-[#a89080]">{comment.length}/1000</span>
            </div>
            {isReadOnly ? (
              <div className="p-3.5 rounded-xl bg-[#F7ECEA] border border-[#e8d5d0] text-xs text-[#695449] leading-relaxed italic">
                {comment ? `“${comment}”` : "Tidak ada komentar tertulis."}
              </div>
            ) : (
              <Textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Berikan masukan yang membangun, apresiasi kerja sama, atau rekomendasi untuk talenta ini..."
                className="text-xs resize-none"
              />
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#F7ECEA]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold"
            >
              {isReadOnly ? "Tutup" : "Batal"}
            </Button>
            {!isReadOnly && (
              <Button
                type="submit"
                size="sm"
                disabled={isPending || rating < 1}
                className="bg-[#C98B75] hover:bg-[#b87a65] text-white text-xs font-bold gap-1.5 shadow-xs"
              >
                {isPending ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Kirim Penilaian</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
