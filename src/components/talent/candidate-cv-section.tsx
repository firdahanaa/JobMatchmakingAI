"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { uploadCandidateCvWithProgress } from "@/lib/cv/upload";
import {
  candidateCvUploadSchema,
  MAX_CANDIDATE_CV_BYTES,
} from "@/lib/validators/talent";
import type { CandidateCv } from "@/types/database";
import {
  getCandidateCvDownloadUrl,
  getCandidateCvStatus,
  registerCandidateCv,
  retryCandidateCvProcessing,
  type CandidateCvSummary,
} from "@/app/talent/profile/cv-actions";

interface CandidateCvSectionProps {
  initialCv: CandidateCvSummary | null;
  onCvChange: (cv: CandidateCvSummary | null) => void;
}

const PROCESSING_LABELS: Record<CandidateCv["processing_status"], string> = {
  pending: "Menunggu pemrosesan",
  processing: "Sedang diproses",
  completed: "Teks berhasil diekstrak",
  needs_ocr: "Memerlukan OCR",
  failed: "Pemrosesan gagal",
};

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CandidateCvSection({
  initialCv,
  onCvChange,
}: CandidateCvSectionProps) {
  const [cv, setCv] = React.useState<CandidateCvSummary | null>(initialCv);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const cvId = cv?.id;
  const cvStatus = cv?.processing_status;

  React.useEffect(() => {
    if (!cvId || (cvStatus !== "pending" && cvStatus !== "processing")) {
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const result = await getCandidateCvStatus(cvId);
      if (!active) return;
      if (result.cv) {
        setCv(result.cv);
        onCvChange(result.cv);
        if (result.cv.processing_status === "pending" || result.cv.processing_status === "processing") {
          timer = setTimeout(poll, 2000);
        }
      } else if (result.error) {
        setErrorMessage(result.error);
        timer = setTimeout(poll, 5000);
      }
    };

    timer = setTimeout(poll, 1500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [cvId, cvStatus, onCvChange]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setUploadProgress(0);

    try {
      if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("Pilih dokumen PDF.");
      }
      if (file.size < 1 || file.size > MAX_CANDIDATE_CV_BYTES) {
        throw new Error("Ukuran CV harus lebih dari 0 dan maksimal 10 MB.");
      }

      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Sesi telah berakhir. Silakan login kembali.");
      }

      const objectPath = `${user.id}/${crypto.randomUUID()}.pdf`;
      const validation = candidateCvUploadSchema.safeParse({
        originalFilename: file.name,
        contentType: file.type,
        fileSizeBytes: file.size,
        objectPath,
      });
      if (!validation.success) {
        throw new Error(validation.error.issues[0]?.message || "Informasi CV tidak valid.");
      }

      await uploadCandidateCvWithProgress(file, objectPath, setUploadProgress);
      const result = await registerCandidateCv(validation.data);
      if (!result.success || !result.cv) {
        throw new Error(result.error || "Gagal menyimpan versi CV.");
      }

      setCv(result.cv);
      onCvChange(result.cv);
      toast.success("CV berhasil diunggah. Pemrosesan dilanjutkan di latar belakang.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unggahan CV gagal.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setUploadProgress(null);
      event.target.value = "";
    }
  };

  const handleDownload = async () => {
    if (!cv) return;
    setIsDownloading(true);
    setErrorMessage(null);
    try {
      const result = await getCandidateCvDownloadUrl(cv.id);
      if (!result.url) {
        throw new Error(result.error || "Gagal membuat tautan unduhan CV.");
      }
      window.location.assign(result.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengunduh CV.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRetry = async () => {
    if (!cv) return;
    setIsRetrying(true);
    setErrorMessage(null);
    const result = await retryCandidateCvProcessing(cv.id);
    if (result.success) {
      const pendingCv = { ...cv, processing_status: "pending" as const, processing_error: null };
      setCv(pendingCv);
      onCvChange(pendingCv);
      toast.success("Pemrosesan CV dijadwalkan ulang.");
    } else {
      setErrorMessage(result.error || "Tidak dapat mengulang pemrosesan CV.");
    }
    setIsRetrying(false);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#0F2A5E]">CV / Resume</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#4A7AAF]">
            Unggah PDF privat. Berkas hanya dapat diakses oleh kamu dan vendor pada lamaran terkait.
            Maksimal 10 MB.
          </p>
        </div>
      </div>

      {cv ? (
        <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2.5">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-800">{cv.original_filename}</p>
                <p className="mt-0.5 text-2xs text-slate-500">
                  {formatFileSize(cv.file_size_bytes)} · Diunggah{" "}
                  {new Date(cv.uploaded_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-sky-200 bg-white px-2.5 py-1 text-2xs font-semibold text-sky-800">
              {(cv.processing_status === "pending" || cv.processing_status === "processing") ? (
                <Clock3 className="h-3 w-3" />
              ) : cv.processing_status === "completed" ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              ) : (
                <AlertCircle className="h-3 w-3 text-amber-600" />
              )}
              {PROCESSING_LABELS[cv.processing_status]}
            </span>
          </div>

          {cv.processing_error && (
            <p className="mt-2 text-xs leading-relaxed text-amber-800">{cv.processing_error}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDownload}
              isLoading={isDownloading}
              className="h-8 gap-1.5 border-sky-200 text-xs text-sky-800"
            >
              <Download className="h-3.5 w-3.5" />
              Unduh CV
            </Button>
            {cv.processing_status === "failed" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRetry}
                isLoading={isRetrying}
                className="h-8 gap-1.5 border-amber-200 text-xs text-amber-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Coba proses lagi
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-sky-200 bg-sky-50/40 p-4 text-center">
          <p className="text-xs font-semibold text-slate-700">Belum ada CV yang diunggah.</p>
          <p className="mt-1 text-2xs text-slate-500">
            CV bersifat opsional dan dapat diperbarui kapan saja.
          </p>
        </div>
      )}

      {uploadProgress !== null && (
        <div className="space-y-1.5" aria-live="polite">
          <div className="flex justify-between text-2xs font-semibold text-sky-800">
            <span>Mengunggah PDF...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2 bg-sky-100" />
        </div>
      )}

      {errorMessage && (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-rose-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {errorMessage}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleUpload}
          disabled={uploadProgress !== null}
          className="sr-only"
          aria-label="Pilih berkas CV PDF"
        />
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadProgress !== null}
          className="h-9 gap-2 bg-gradient-to-r from-sky-600 to-blue-600 text-xs font-semibold text-white hover:from-sky-700 hover:to-blue-700"
        >
          <UploadCloud className="h-4 w-4" />
          {cv ? "Ganti CV" : "Unggah CV PDF"}
        </Button>
        <span className="text-2xs text-slate-500">
          Mengunggah CV baru tidak mengubah dokumen pada lamaran sebelumnya.
        </span>
      </div>
    </section>
  );
}
