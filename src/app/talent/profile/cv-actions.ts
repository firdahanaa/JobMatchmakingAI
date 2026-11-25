"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/cv/processing";
import { canVendorAccessApplicationCv } from "@/lib/cv/authorization";
import {
  candidateCvIdSchema,
  candidateCvUploadSchema,
} from "@/lib/validators/talent";
import type { CandidateCv } from "@/types/database";

const CV_BUCKET = "talent-cvs";
const CV_FIELDS =
  "id, candidate_id, original_filename, file_size_bytes, processing_status, processing_error, uploaded_at, processed_at";

export type CandidateCvSummary = Pick<
  CandidateCv,
  | "id"
  | "original_filename"
  | "file_size_bytes"
  | "processing_status"
  | "processing_error"
  | "uploaded_at"
  | "processed_at"
>;

async function getUserForRole(role: "talent" | "vendor") {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null, error: "Sesi telah berakhir. Silakan login kembali." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("CV role lookup error:", profileError);
    return { supabase, user: null, error: "Gagal memverifikasi akses akun." };
  }
  if (profile?.role !== role) {
    return {
      supabase,
      user: null,
      error: role === "talent"
        ? "Fitur CV hanya tersedia untuk akun Talent."
        : "Akses ditolak.",
    };
  }

  return { supabase, user, error: null };
}

export async function registerCandidateCv(input: {
  originalFilename: string;
  contentType: string;
  fileSizeBytes: number;
  objectPath: string;
}): Promise<{ success: boolean; cv?: CandidateCvSummary; error: string | null }> {
  const parsed = candidateCvUploadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Informasi CV tidak valid.",
    };
  }

  const { supabase, user, error: accessError } = await getUserForRole("talent");
  if (!user) {
    return { success: false, error: accessError };
  }

  const [ownerId, objectName] = parsed.data.objectPath.split("/");
  if (ownerId !== user.id || !objectName) {
    return { success: false, error: "Lokasi berkas CV tidak sesuai dengan akun." };
  }

  const { data: storedObjects, error: storageError } = await supabase.storage
    .from(CV_BUCKET)
    .list(user.id, { search: objectName, limit: 10 });

  if (storageError) {
    console.error("CV storage verification error:", storageError);
    return { success: false, error: "Gagal memverifikasi berkas yang diunggah." };
  }

  const uploadedObject = storedObjects?.find((object) => object.name === objectName);
  if (
    !uploadedObject ||
    uploadedObject.metadata?.mimetype !== "application/pdf" ||
    uploadedObject.metadata.size !== parsed.data.fileSizeBytes
  ) {
    return {
      success: false,
      error: "Berkas PDF tidak ditemukan atau metadata ukurannya tidak sesuai.",
    };
  }

  const { data: cvId, error: registrationError } = await supabase.rpc(
    "register_candidate_cv",
    {
      p_object_path: parsed.data.objectPath,
      p_original_filename: parsed.data.originalFilename,
      p_file_size_bytes: parsed.data.fileSizeBytes,
    },
  );

  if (registrationError || !cvId) {
    console.error("Candidate CV registration error:", registrationError);
    return {
      success: false,
      error: registrationError?.message || "Gagal menyimpan versi CV.",
    };
  }

  const { data: cv, error: cvError } = await supabase
    .from("candidate_cvs")
    .select(CV_FIELDS)
    .eq("id", cvId)
    .eq("candidate_id", user.id)
    .single();

  if (cvError || !cv) {
    console.error("Candidate CV reload error:", cvError);
    return { success: false, error: "CV tersimpan, tetapi statusnya gagal dimuat." };
  }

  after(async () => processCandidateCv(cvId, user.id));
  revalidatePath("/talent/profile");
  return { success: true, cv: cv as CandidateCvSummary, error: null };
}

export async function getCandidateCvStatus(
  cvId: string,
): Promise<{ cv: CandidateCvSummary | null; error: string | null }> {
  const idResult = candidateCvIdSchema.safeParse(cvId);
  if (!idResult.success) {
    return { cv: null, error: "ID CV tidak valid." };
  }

  const { supabase, user, error: accessError } = await getUserForRole("talent");
  if (!user) {
    return { cv: null, error: accessError };
  }

  const { data: cv, error } = await supabase
    .from("candidate_cvs")
    .select(CV_FIELDS)
    .eq("id", idResult.data)
    .eq("candidate_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Candidate CV status error:", error);
    return { cv: null, error: "Gagal memuat status pemrosesan CV." };
  }
  return { cv: (cv as CandidateCvSummary | null) ?? null, error: null };
}

export async function retryCandidateCvProcessing(
  cvId: string,
): Promise<{ success: boolean; error: string | null }> {
  const idResult = candidateCvIdSchema.safeParse(cvId);
  if (!idResult.success) {
    return { success: false, error: "ID CV tidak valid." };
  }

  const { supabase, user, error: accessError } = await getUserForRole("talent");
  if (!user) {
    return { success: false, error: accessError };
  }

  const { data: cv, error } = await supabase
    .from("candidate_cvs")
    .update({
      processing_status: "pending",
      processing_error: null,
      processed_at: null,
    })
    .eq("id", idResult.data)
    .eq("candidate_id", user.id)
    .eq("processing_status", "failed")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Candidate CV retry error:", error);
    return { success: false, error: "Gagal menjadwalkan ulang pemrosesan CV." };
  }
  if (!cv) {
    return { success: false, error: "Hanya CV yang gagal diproses yang dapat dicoba ulang." };
  }

  after(async () => processCandidateCv(cv.id, user.id));
  revalidatePath("/talent/profile");
  return { success: true, error: null };
}

export async function processCandidateCv(cvId: string, candidateId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || user.id !== candidateId) {
    console.error("CV processor could not verify the candidate session.", authError);
    return;
  }

  const { data: cv, error: claimError } = await supabase
    .from("candidate_cvs")
    .update({
      processing_status: "processing",
      processing_error: null,
      processed_at: null,
    })
    .eq("id", cvId)
    .eq("candidate_id", candidateId)
    .eq("processing_status", "pending")
    .select("object_path, file_size_bytes")
    .maybeSingle();

  if (claimError) {
    console.error("CV processing claim error:", claimError);
    return;
  }
  if (!cv) {
    return;
  }

  try {
    const { data: file, error: downloadError } = await supabase.storage
      .from(CV_BUCKET)
      .download(cv.object_path);
    if (downloadError || !file) {
      throw new Error(downloadError?.message || "Berkas CV tidak dapat dibaca.");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength !== cv.file_size_bytes) {
      throw new Error("Ukuran berkas CV berubah setelah diunggah.");
    }

    const extraction = await extractPdfText(bytes);
    const { error: extractionError } = await supabase
      .from("candidate_cv_extractions")
      .upsert({
        cv_id: cvId,
        candidate_id: candidateId,
        extracted_text: extraction.text,
        structured_data: extraction.structuredData,
      });

    if (extractionError) {
      throw new Error(extractionError.message);
    }

    const { error: statusError } = await supabase
      .from("candidate_cvs")
      .update({
        processing_status: extraction.status,
        processing_error: extraction.error,
        processed_at: new Date().toISOString(),
      })
      .eq("id", cvId)
      .eq("candidate_id", candidateId);

    if (statusError) {
      throw new Error(statusError.message);
    }
    revalidatePath("/talent/profile");
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF tidak dapat diproses.";
    console.error("CV processing error:", error);
    const { error: updateError } = await supabase
      .from("candidate_cvs")
      .update({
        processing_status: "failed",
        processing_error: message,
        processed_at: new Date().toISOString(),
      })
      .eq("id", cvId)
      .eq("candidate_id", candidateId);

    if (updateError) {
      console.error("Failed to persist CV processing error:", updateError);
    }
    revalidatePath("/talent/profile");
  }
}

export async function getCandidateCvDownloadUrl(
  cvId: string,
): Promise<{ url: string | null; error: string | null }> {
  const idResult = candidateCvIdSchema.safeParse(cvId);
  if (!idResult.success) {
    return { url: null, error: "ID CV tidak valid." };
  }

  const { supabase, user, error: accessError } = await getUserForRole("talent");
  if (!user) {
    return { url: null, error: accessError };
  }

  const { data: cv, error: cvError } = await supabase
    .from("candidate_cvs")
    .select("id, candidate_id, object_path, original_filename")
    .eq("id", idResult.data)
    .eq("candidate_id", user.id)
    .maybeSingle();

  if (cvError || !cv) {
    console.error("Candidate CV download lookup error:", cvError);
    return { url: null, error: "CV tidak ditemukan atau akses ditolak." };
  }

  const { data: signedUrl, error: signedUrlError } = await supabase.storage
    .from(CV_BUCKET)
    .createSignedUrl(cv.object_path, 60, { download: cv.original_filename });

  if (signedUrlError || !signedUrl) {
    console.error("Candidate CV signed URL error:", signedUrlError);
    return { url: null, error: "Gagal membuat tautan unduhan CV." };
  }
  return { url: signedUrl.signedUrl, error: null };
}

export async function getApplicantCvDownloadUrl(
  applicationId: string,
): Promise<{ url: string | null; error: string | null }> {
  const idResult = candidateCvIdSchema.safeParse(applicationId);
  if (!idResult.success) {
    return { url: null, error: "ID lamaran tidak valid." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { url: null, error: "Sesi telah berakhir. Silakan login kembali." };
  }

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("project_id, talent_id, candidate_cv_id")
    .eq("id", idResult.data)
    .maybeSingle();

  if (applicationError || !application) {
    console.error("Applicant CV application lookup error:", applicationError);
    return { url: null, error: "Lamaran tidak ditemukan atau akses ditolak." };
  }
  if (!application.candidate_cv_id) {
    return { url: null, error: "Pelamar tidak menyertakan CV pada lamaran ini." };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", application.project_id)
    .maybeSingle();

  if (projectError || !project) {
    return { url: null, error: "CV hanya dapat diakses oleh tim HR perusahaan pemilik proyek." };
  }

  const projectCompanyId = (project as { company_id?: string | null }).company_id ?? null;

  // Check active company membership or legacy vendor ownership
  let resolvedHrRole: string = "talent";
  let userCompanyId: string | null = null;
  let companyMemberStatus: "active" | "disabled" = "active";

  if (projectCompanyId) {
    const { data: memberRow } = await supabase
      .from("company_members")
      .select("company_id, role, status")
      .eq("company_id", projectCompanyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberRow) {
      resolvedHrRole = memberRow.role;
      userCompanyId = memberRow.company_id;
      companyMemberStatus = memberRow.status as "active" | "disabled";
    }
  }

  if (resolvedHrRole === "talent" && project.vendor_id === user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role === "vendor") {
      resolvedHrRole = "vendor";
    }
  }

  const { data: cv, error: cvError } = await supabase
    .from("candidate_cvs")
    .select("id, candidate_id, object_path, original_filename")
    .eq("id", application.candidate_cv_id)
    .eq("candidate_id", application.talent_id)
    .maybeSingle();

  if (cvError || !cv) {
    console.error("Applicant CV lookup error:", cvError);
    return { url: null, error: "Dokumen CV tidak tersedia untuk lamaran ini." };
  }
  if (
    !canVendorAccessApplicationCv({
      userRole: resolvedHrRole,
      vendorId: user.id,
      projectVendorId: project.vendor_id,
      userCompanyId,
      projectCompanyId,
      companyMemberStatus,
      applicationCandidateId: application.talent_id,
      cvCandidateId: cv.candidate_id,
      applicationCvId: application.candidate_cv_id,
      cvId: cv.id,
    })
  ) {
    return { url: null, error: "Akses terhadap snapshot CV ini ditolak." };
  }

  const { data: signedUrl, error: signedUrlError } = await supabase.storage
    .from(CV_BUCKET)
    .createSignedUrl(cv.object_path, 60, { download: cv.original_filename });

  if (signedUrlError || !signedUrl) {
    console.error("Applicant CV signed URL error:", signedUrlError);
    return { url: null, error: "Gagal membuat tautan unduhan CV." };
  }
  return { url: signedUrl.signedUrl, error: null };
}
