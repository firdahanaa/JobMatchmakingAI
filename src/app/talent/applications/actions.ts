"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  applicationAttachmentsSchema,
  applyApplicationSchema,
  MAX_APPLICATION_PDF_BYTES,
  submitWorkDocumentationSchema,
  uuidSchema,
} from "@/lib/validators/application";
import {
  canTransition,
  getApplicationStatusLabel,
} from "@/lib/workflow/transitions";
import { calculateMatch } from "@/lib/matching";
import { getTalentMatchingContext } from "@/app/talent/projects/actions";
import type { ProjectContext, ProjectSkill, SkillLevel } from "@/lib/matching/types";
import type {
  ApplicationStatus,
  PaymentStatus,
  ProjectDifficulty,
  ProjectType,
  WorkMode,
} from "@/types/database";

export interface TalentApplicationItem {
  id: string;
  projectId: string;
  projectTitle: string;
  vendorName: string;
  difficulty: ProjectDifficulty;
  type: ProjectType;
  mode: WorkMode;
  rewardAmount: number | null;
  rewardNote: string | null;
  durationWeeks: number | null;
  projectStatus: string;
  status: ApplicationStatus;
  paymentStatus: PaymentStatus;
  cvPath: string | null;
  portfolioPath: string | null;
  relatedLinks: string[];
  submissionUrl: string | null;
  submissionLinks: string[];
  submissionNotes: string | null;
  revisionNotes: string | null;
  hasReview: boolean;
  message: string | null;
  contactEmail: string | null;
  createdAt: string;
}

export type ApplicationDocumentKind = "cv" | "portfolio";

async function hasPdfSignature(file: File): Promise<boolean> {
  if (file.size > MAX_APPLICATION_PDF_BYTES) return false;
  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...signature) === "%PDF-";
}

export async function createApplicationDocumentSignedUrl(
  applicationId: string,
  documentKind: ApplicationDocumentKind
): Promise<{ signedUrl: string | null; error: string | null }> {
  if (documentKind !== "cv" && documentKind !== "portfolio") {
    return { signedUrl: null, error: "Jenis dokumen tidak valid." };
  }

  const idValidation = uuidSchema.safeParse(applicationId);
  if (!idValidation.success) {
    return { signedUrl: null, error: "ID lamaran tidak valid." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { signedUrl: null, error: "Silakan login untuk mengunduh dokumen." };
  }

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("id, talent_id, cv_path, portfolio_path, projects(vendor_id)")
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationError || !application) {
    return { signedUrl: null, error: "Lamaran tidak ditemukan atau tidak dapat diakses." };
  }

  const project = Array.isArray(application.projects)
    ? application.projects[0]
    : application.projects;
  if (application.talent_id !== user.id && project?.vendor_id !== user.id) {
    return { signedUrl: null, error: "Kamu tidak memiliki akses ke dokumen ini." };
  }

  const path = documentKind === "cv" ? application.cv_path : application.portfolio_path;
  const expectedFileName = documentKind === "cv" ? "cv.pdf" : "portfolio.pdf";
  if (path !== `${application.talent_id}/${application.id}/${expectedFileName}`) {
    return { signedUrl: null, error: "Dokumen tidak tersedia." };
  }

  const { data, error } = await supabase.storage
    .from("application-docs")
    .createSignedUrl(path, 300, { download: true });

  if (error || !data) {
    return { signedUrl: null, error: "Gagal membuat tautan unduhan sementara." };
  }

  return { signedUrl: data.signedUrl, error: null };
}

/**
 * Apply to an open project with server-side calculated match score snapshot
 */
export async function applyToProject(
  projectId: string,
  formData: FormData
): Promise<{ success: boolean; error: string | null; applicationId?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Kamu harus login untuk melamar ke proyek ini." };
    }

    // Input validation
    const idValidation = uuidSchema.safeParse(projectId);
    if (!idValidation.success) {
      return { success: false, error: "ID proyek tidak valid." };
    }

    // Role verification (defense-in-depth: only users with role 'talent' can apply)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "talent") {
      return {
        success: false,
        error: "Akses ditolak. Hanya akun Talenta yang dapat mengajukan lamaran ke proyek.",
      };
    }

    // 1. Validasi pesan lamaran (maks 500 karakter)
    let relatedLinks: unknown;
    try {
      relatedLinks = JSON.parse(String(formData.get("relatedLinks") ?? "[]"));
    } catch {
      return { success: false, error: "Daftar link terkait tidak valid." };
    }

    const rawMessage = String(formData.get("message") ?? "");
    const parseResult = applyApplicationSchema.safeParse({ message: rawMessage, relatedLinks });
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.issues[0]?.message || "Pesan lamaran tidak valid.",
      };
    }
    const cleanMessage = (parseResult.data.message || "").trim();

    const cvFile = formData.get("cv");
    const portfolioEntry = formData.get("portfolio");
    const portfolioFile = portfolioEntry instanceof File ? portfolioEntry : null;
    const attachments = applicationAttachmentsSchema.safeParse({
      cv: cvFile,
      portfolio: portfolioFile,
    });
    if (!attachments.success) {
      return {
        success: false,
        error: attachments.error.issues[0]?.message || "Periksa kembali lampiran PDF.",
      };
    }
    if (!(await hasPdfSignature(attachments.data.cv))) {
      return { success: false, error: "Isi file CV tidak terdeteksi sebagai PDF yang valid." };
    }
    if (attachments.data.portfolio && !(await hasPdfSignature(attachments.data.portfolio))) {
      return { success: false, error: "Isi file portofolio tidak terdeteksi sebagai PDF yang valid." };
    }

    // 2. Periksa status proyek (harus 'open')
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, title, status, hours_per_week, mode, vendor_id, portfolio_required")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) {
      return { success: false, error: "Proyek tidak ditemukan." };
    }

    if (project.status !== "open") {
      return {
        success: false,
        error: "Proyek ini sudah tidak menerima lamaran baru (status bukan open).",
      };
    }

    if (project.portfolio_required && !attachments.data.portfolio) {
      return { success: false, error: "Proyek ini mewajibkan dokumen portofolio PDF." };
    }

    // Cegah vendor melamar ke proyeknya sendiri
    if (project.vendor_id === user.id) {
      return {
        success: false,
        error: "Kamu tidak dapat melamar ke proyek milik organisasi kamu sendiri.",
      };
    }

    // 3. Periksa apakah sudah pernah melamar (cegah apply ganda)
    const { data: existingApp, error: existingAppError } = await supabase
      .from("applications")
      .select("id, status, message, match_score, related_links, created_at, cv_path, portfolio_path")
      .eq("project_id", projectId)
      .eq("talent_id", user.id)
      .maybeSingle();

    if (existingAppError && existingAppError.code !== "PGRST116") {
      console.error("Error checking existing application:", existingAppError);
    }

    if (existingApp && existingApp.status !== "withdrawn") {
      return {
        success: false,
        error: "Kamu sudah pernah melamar ke proyek ini. Periksa status lamaranmu di halaman 'Lamaran Saya'.",
      };
    }

    // 4. Hitung Match Score di server (bukan dari client)
    const { context: talentContext, error: contextError } = await getTalentMatchingContext();
    if (contextError || !talentContext) {
      return {
        success: false,
        error: contextError || "Gagal memproses data profil talenta.",
      };
    }

    // Ambil skills proyek untuk kalkulasi match
    const { data: pSkillsData } = await supabase
      .from("project_skills")
      .select("skill_id, min_level, is_required, skills(name)")
      .eq("project_id", projectId);

    type PSkillRow = {
      skill_id: number;
      min_level: SkillLevel;
      is_required: boolean;
      skills: { name: string } | { name: string }[];
    };

    const projectSkills: ProjectSkill[] = ((pSkillsData || []) as unknown as PSkillRow[]).map(
      (ps) => {
        const sObj = Array.isArray(ps.skills) ? ps.skills[0] : ps.skills;
        return {
          skillId: ps.skill_id,
          name: sObj?.name || `Skill #${ps.skill_id}`,
          minLevel: ps.min_level,
          isRequired: ps.is_required,
        };
      }
    );

    const projectContext: ProjectContext = {
      skills: projectSkills,
      hoursPerWeek: project.hours_per_week,
      mode: project.mode,
    };

    const matchResult = calculateMatch(talentContext, projectContext);
    const serverMatchScore = matchResult.score;

    // Sertakan email talent dalam pesan untuk privasi vendor (hanya setelah apply)
    const userEmail = user.email || "";
    const contactFooter = userEmail ? `\n\n[Kontak: ${userEmail}]` : "";
    const finalStoredMessage = cleanMessage
      ? `${cleanMessage}${contactFooter}`
      : contactFooter.trim();

    // 5. Simpan ke database
    let createdAppId = existingApp?.id;

    if (existingApp && existingApp.status === "withdrawn") {
      // Re-apply: update existing withdrawn record to pending
      const { data: updatedApp, error: updateError } = await supabase
        .from("applications")
        .update({
          message: finalStoredMessage,
          match_score: serverMatchScore,
          status: "pending",
          created_at: new Date().toISOString(),
          related_links: parseResult.data.relatedLinks,
        })
        .eq("id", existingApp.id)
        .select("id")
        .single();

      if (updateError) {
        console.error("Re-apply error:", updateError);
        return { success: false, error: updateError.message || "Gagal memperbarui lamaran." };
      }
      createdAppId = updatedApp.id;
    } else {
      // Insert new application
      const { data: newApp, error: insertError } = await supabase
        .from("applications")
        .insert({
          project_id: projectId,
          talent_id: user.id,
          message: finalStoredMessage,
          match_score: serverMatchScore,
          status: "pending",
          related_links: parseResult.data.relatedLinks,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Insert application error:", insertError);
        if (insertError.code === "23505") {
          return {
            success: false,
            error: "Kamu sudah pernah melamar ke proyek ini.",
          };
        }
        return { success: false, error: insertError.message || "Gagal mengirimkan lamaran." };
      }
      createdAppId = newApp.id;
    }

    if (!createdAppId) {
      return { success: false, error: "Gagal mendapatkan ID lamaran." };
    }

    const cvPath = `${user.id}/${createdAppId}/cv.pdf`;
    const portfolioPath = attachments.data.portfolio
      ? `${user.id}/${createdAppId}/portfolio.pdf`
      : null;
    const uploadedPaths: string[] = [];
    const previousPaths = new Set(
      [existingApp?.cv_path, existingApp?.portfolio_path].filter((path): path is string => !!path)
    );

    const rollbackApplication = async () => {
      const newPaths = uploadedPaths.filter((path) => !previousPaths.has(path));
      if (newPaths.length > 0) {
        await supabase.storage.from("application-docs").remove(newPaths);
      }
      if (existingApp?.status === "withdrawn") {
        await supabase
          .from("applications")
          .update({
            status: existingApp.status,
            message: existingApp.message,
            match_score: existingApp.match_score,
            related_links: existingApp.related_links,
            created_at: existingApp.created_at,
          })
          .eq("id", createdAppId)
          .eq("talent_id", user.id);
      } else {
        await supabase
          .from("applications")
          .delete()
          .eq("id", createdAppId)
          .eq("talent_id", user.id);
      }
    };

    const filesToUpload = [
      { path: cvPath, file: attachments.data.cv },
      ...(attachments.data.portfolio && portfolioPath
        ? [{ path: portfolioPath, file: attachments.data.portfolio }]
        : []),
    ];
    for (const { path, file } of filesToUpload) {
      const { error: uploadError } = await supabase.storage
        .from("application-docs")
        .upload(path, file, { contentType: "application/pdf", upsert: true });
      if (uploadError) {
        await rollbackApplication();
        return { success: false, error: "Gagal mengunggah lampiran. Coba kirim lamaran lagi." };
      }
      uploadedPaths.push(path);
    }

    const { error: pathUpdateError } = await supabase
      .from("applications")
      .update({ cv_path: cvPath, portfolio_path: portfolioPath })
      .eq("id", createdAppId)
      .eq("talent_id", user.id);

    if (pathUpdateError) {
      await rollbackApplication();
      return { success: false, error: "Lampiran tersimpan, tetapi gagal menghubungkan file ke lamaran." };
    }

    if (existingApp?.portfolio_path && !portfolioPath) {
      await supabase.storage.from("application-docs").remove([existingApp.portfolio_path]);
    }

    revalidatePath("/talent/projects");
    revalidatePath(`/talent/projects/${projectId}`);
    revalidatePath("/talent/applications");
    revalidatePath("/talent/dashboard");
    revalidatePath(`/vendor/projects/${projectId}/applicants`);

    return {
      success: true,
      applicationId: createdAppId,
      error: null,
    };
  } catch (err: unknown) {
    console.error("Error in applyToProject:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat memproses lamaran.",
    };
  }
}

/**
 * Withdraw an application while still in 'pending' status
 */
export async function withdrawApplication(
  applicationId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Kamu harus login untuk membatalkan lamaran." };
    }

    // Input validation
    const idValidation = uuidSchema.safeParse(applicationId);
    if (!idValidation.success) {
      return { success: false, error: "ID lamaran tidak valid." };
    }

    // Role verification
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "talent") {
      return {
        success: false,
        error: "Akses ditolak. Hanya akun Talenta yang berhak membatalkan lamaran.",
      };
    }

    // 1. Cek kepemilikan dan status lamaran
    const { data: app, error: appError } = await supabase
      .from("applications")
      .select("id, talent_id, status, project_id")
      .eq("id", applicationId)
      .maybeSingle();

    if (appError || !app) {
      return { success: false, error: "Lamaran tidak ditemukan." };
    }

    if (app.talent_id !== user.id) {
      return {
        success: false,
        error: "Kamu tidak berhak membatalkan lamaran talenta lain.",
      };
    }

    const currentStatus = app.status as ApplicationStatus;
    const isAllowed = canTransition(currentStatus, "withdrawn", "talent");
    if (!isAllowed) {
      return {
        success: false,
        error: `Lamaran berstatus '${getApplicationStatusLabel(currentStatus)}' tidak dapat dibatalkan secara mandiri.`,
      };
    }

    // 2. Update status ke 'withdrawn'
    const { error: updateError } = await supabase
      .from("applications")
      .update({ status: "withdrawn" })
      .eq("id", applicationId)
      .eq("talent_id", user.id);

    if (updateError) {
      return { success: false, error: updateError.message || "Gagal membatalkan lamaran." };
    }

    revalidatePath("/talent/applications");
    revalidatePath(`/talent/projects/${app.project_id}`);
    revalidatePath(`/vendor/projects/${app.project_id}/applicants`);

    return { success: true, error: null };
  } catch (err: unknown) {
    console.error("Error withdrawing application:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal membatalkan lamaran.",
    };
  }
}

/**
 * Talent submits project work documentation/results (accepted -> submitted)
 */
export async function submitWorkDocumentation(
  applicationId: string,
  submissionLinks: string[],
  submissionNotes?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const parseResult = submitWorkDocumentationSchema.safeParse({
      submissionLinks,
      submissionNotes,
    });
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.issues[0]?.message || "Input dokumentasi tidak valid.",
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Kamu harus login untuk menyerahkan hasil pengerjaan." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "talent") {
      return {
        success: false,
        error: "Akses ditolak. Hanya akun Talenta yang dapat mengirimkan hasil pengerjaan.",
      };
    }

    const { data: app, error: appError } = await supabase
      .from("applications")
      .select("id, talent_id, status, project_id")
      .eq("id", applicationId)
      .maybeSingle();

    if (appError || !app) {
      return { success: false, error: "Lamaran tidak ditemukan." };
    }

    if (app.talent_id !== user.id) {
      return {
        success: false,
        error: "Kamu tidak berhak menyerahkan hasil untuk lamaran ini.",
      };
    }

    const currentStatus = app.status as ApplicationStatus;
    const isAllowed = canTransition(currentStatus, "submitted", "talent");
    if (!isAllowed) {
      return {
        success: false,
        error: `Tidak dapat mengirim hasil pada status '${getApplicationStatusLabel(currentStatus)}'. Status harus 'Diterima'.`,
      };
    }

    const { error: updateError } = await supabase
      .from("applications")
      .update({
        status: "submitted",
        submission_links: parseResult.data.submissionLinks,
        submission_url: parseResult.data.submissionLinks[0],
        submission_notes: parseResult.data.submissionNotes?.trim() || null,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (updateError) {
      return {
        success: false,
        error: updateError.message || "Gagal memperbarui status pengiriman hasil.",
      };
    }

    revalidatePath("/talent/applications");
    revalidatePath(`/talent/projects/${app.project_id}`);
    revalidatePath(`/vendor/projects/${app.project_id}/applicants`);

    return { success: true, error: null };
  } catch (err: unknown) {
    console.error("Error submitting documentation:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat mengirim hasil pengerjaan.",
    };
  }
}

/**
 * Get all applications submitted by the logged-in talent
 */
export async function getMyApplications(): Promise<{
  data: TalentApplicationItem[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: [], error: "Silakan login terlebih dahulu." };
    }

    // Role verification
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "talent") {
      return { data: [], error: "Akses ditolak. Fitur ini hanya untuk pengguna Talenta." };
    }

    const { data: applicationsData, error: appsError } = await supabase
      .from("applications")
      .select(`
        id,
        project_id,
        talent_id,
        status,
        payment_status,
        cv_path,
        portfolio_path,
        related_links,
        submission_url,
        submission_links,
        submission_notes,
        revision_notes,
        message,
        created_at,
        reviews (id),
        projects (
          id,
          title,
          difficulty,
          type,
          mode,
          reward_amount,
          reward_note,
          duration_weeks,
          status,
          vendor_profiles:vendor_id (
            organization_name,
            location
          )
        )
      `)
      .eq("talent_id", user.id)
      .order("created_at", { ascending: false });

    if (appsError) {
      console.error("Error fetching my applications:", appsError);
      return { data: [], error: "Gagal memuat riwayat lamaran." };
    }

    type RawApp = {
      id: string;
      project_id: string;
      status: ApplicationStatus;
      payment_status: PaymentStatus;
      cv_path: string | null;
      portfolio_path: string | null;
      related_links: string[] | null;
      submission_url: string | null;
      submission_links: string[] | null;
      submission_notes: string | null;
      revision_notes: string | null;
      message: string | null;
      created_at: string;
      reviews: { id: string }[] | { id: string } | null;
      projects: {
        id: string;
        title: string;
        difficulty: ProjectDifficulty;
        type: ProjectType;
        mode: WorkMode;
        reward_amount: number | null;
        reward_note: string | null;
        duration_weeks: number | null;
        status: string;
        vendor_profiles?: { organization_name: string; location: string | null } | { organization_name: string; location: string | null }[] | null;
      } | {
        id: string;
        title: string;
        difficulty: ProjectDifficulty;
        type: ProjectType;
        mode: WorkMode;
        reward_amount: number | null;
        reward_note: string | null;
        duration_weeks: number | null;
        status: string;
        vendor_profiles?: { organization_name: string; location: string | null } | { organization_name: string; location: string | null }[] | null;
      }[] | null;
    };

    const rawList = (applicationsData || []) as unknown as RawApp[];

    const items: TalentApplicationItem[] = rawList.map((app) => {
      const p = Array.isArray(app.projects) ? app.projects[0] : app.projects;
      const v = Array.isArray(p?.vendor_profiles)
        ? p?.vendor_profiles[0]
        : p?.vendor_profiles;

      // Pisahkan pesan pelamar dari contact tag
      let cleanMsg = app.message || "";
      let contactEmail: string | null = null;

      if (cleanMsg.includes("[Kontak:")) {
        const match = cleanMsg.match(/\[Kontak:\s*([^\]]+)\]/);
        if (match) {
          contactEmail = match[1].trim();
          cleanMsg = cleanMsg.replace(/\[Kontak:\s*[^\]]+\]/, "").trim();
        }
      }

      return {
        id: app.id,
        projectId: app.project_id,
        projectTitle: p?.title || "Proyek",
        vendorName: v?.organization_name || "Organisasi Vendor",
        difficulty: p?.difficulty || "beginner",
        type: p?.type || "freelance",
        mode: p?.mode || "remote",
        rewardAmount: p?.reward_amount ?? null,
        rewardNote: p?.reward_note ?? null,
        durationWeeks: p?.duration_weeks ?? null,
        projectStatus: p?.status || "open",
        status: app.status,
        paymentStatus: app.payment_status,
        cvPath: app.cv_path,
        portfolioPath: app.portfolio_path,
        relatedLinks: app.related_links || [],
        submissionUrl: app.submission_url,
        submissionLinks: app.submission_links || (app.submission_url ? [app.submission_url] : []),
        submissionNotes: app.submission_notes,
        revisionNotes: app.revision_notes,
        hasReview: Array.isArray(app.reviews)
          ? app.reviews.length > 0
          : app.reviews !== null,
        message: cleanMsg || null,
        contactEmail,
        createdAt: app.created_at,
      };
    });

    return { data: items, error: null };
  } catch (err: unknown) {
    console.error("Error in getMyApplications:", err);
    return {
      data: [],
      error: err instanceof Error ? err.message : "Gagal memuat lamaran.",
    };
  }
}

/**
 * Check whether logged-in talent has already applied to a specific project
 */
export async function getApplicationForProject(projectId: string): Promise<{
  application: { id: string; status: ApplicationStatus } | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { application: null };
    }

    const idValidation = uuidSchema.safeParse(projectId);
    if (!idValidation.success) {
      return { application: null };
    }

    const { data: app } = await supabase
      .from("applications")
      .select("id, status")
      .eq("project_id", projectId)
      .eq("talent_id", user.id)
      .maybeSingle();

    if (!app) {
      return { application: null };
    }

    return {
      application: {
        id: app.id,
        status: app.status as ApplicationStatus,
      },
    };
  } catch {
    return { application: null };
  }
}
