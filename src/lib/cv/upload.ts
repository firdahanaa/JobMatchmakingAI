"use client";

import { createClient } from "@/lib/supabase/client";
import { DOCX_MIME_TYPE, PDF_MIME_TYPE } from "@/lib/validators/talent";

const CV_BUCKET = "talent-cvs";

export function resolveCandidateCvContentType(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const isGenericOrEmpty = file.type === "" || file.type === "application/octet-stream";
  if (lowerName.endsWith(".pdf") && (file.type === PDF_MIME_TYPE || isGenericOrEmpty)) {
    return PDF_MIME_TYPE;
  }
  if (lowerName.endsWith(".docx") && (file.type === DOCX_MIME_TYPE || isGenericOrEmpty)) {
    return DOCX_MIME_TYPE;
  }
  return null;
}

export async function uploadCandidateCvWithProgress(
  file: File,
  objectPath: string,
  onProgress: (progress: number) => void,
  contentType: string = resolveCandidateCvContentType(file) ?? PDF_MIME_TYPE,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error("Sesi telah berakhir. Silakan login kembali.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error("Konfigurasi Supabase belum tersedia.");
  }

  const encodedPath = objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(
      "POST",
      `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${CV_BUCKET}/${encodedPath}`,
    );
    request.setRequestHeader("apikey", anonKey);
    request.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    request.setRequestHeader("Content-Type", contentType);
    request.setRequestHeader("x-upsert", "false");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
        return;
      }

      let errorMessage = "Gagal mengunggah CV ke penyimpanan.";
      try {
        const response = JSON.parse(request.responseText) as {
          message?: string;
          error?: string;
        };
        errorMessage = response.message || response.error || errorMessage;
      } catch {
        errorMessage = request.statusText || errorMessage;
      }
      reject(new Error(errorMessage));
    });
    request.addEventListener("error", () => {
      reject(new Error("Koneksi terputus saat mengunggah CV."));
    });
    request.addEventListener("abort", () => {
      reject(new Error("Unggahan CV dibatalkan."));
    });
    request.send(file);
  });
}
