"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { processCandidateCv } from "@/app/talent/profile/cv-actions";
import { applyApplicationSchema, uuidSchema } from "@/lib/validators/application";
import { calculateMatch } from "@/lib/matching";
import { getTalentMatchingContext } from "@/app/talent/projects/actions";
import type { ProjectContext, ProjectSkill, SkillLevel } from "@/lib/matching/types";
import type {
  ApplicationStatus,
  CvProcessingStatus,
  ProjectDifficulty,
  ProjectType,
  ScreeningStatus,
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
  matchScore: number | null;
  status: ApplicationStatus;
  screeningStatus: ScreeningStatus;
  candidateCvFilename: string | null;
  message: string | null;
  contactEmail: string | null;
  createdAt: string;
}

export interface TalentApplyReadiness {
  hasHeadlineAndLocation: boolean;
  hasSkills: boolean;
  currentCv: {
    id: string;
    originalFilename: string;
    processingStatus: CvProcessingStatus;
  } | null;
}

/**
 * Apply to an open project with server-side calculated match score snapshot
 */
export async function applyToProject(
  projectId: string,
  rawMessage?: string
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
    const parseResult = applyApplicationSchema.safeParse({ message: rawMessage });
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.issues[0]?.message || "Pesan lamaran tidak valid.",
      };
    }
    const cleanMessage = (parseResult.data.message || "").trim();

    // 2. Periksa status proyek (harus 'open')
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
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

    // Cegah vendor atau anggota HR perusahaan melamar ke proyek perusahaannya sendiri
    if (project.vendor_id === user.id) {
      return {
        success: false,
        error: "Kamu tidak dapat melamar ke proyek milik organisasi kamu sendiri.",
      };
    }

    const projectCompanyId = (project as { company_id?: string | null }).company_id ?? null;
    if (projectCompanyId) {
      const { data: selfMember } = await supabase
        .from("company_members")
        .select("id")
        .eq("company_id", projectCompanyId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (selfMember) {
        return {
          success: false,
          error: "Anggota tim HR/perusahaan tidak dapat melamar ke lowongan perusahaannya sendiri.",
        };
      }
    }

    // 3. Periksa apakah sudah pernah melamar (cegah apply ganda)
    const { data: existingApp, error: existingAppError } = await supabase
      .from("applications")
      .select("id, status")
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

    const { data: talentProfile, error: talentProfileError } = await supabase
      .from("talent_profiles")
      .select("current_cv_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (talentProfileError) {
      console.error("Candidate CV snapshot lookup error:", talentProfileError);
      return { success: false, error: "Gagal memuat versi CV untuk lamaran." };
    }

    const candidateCvId = talentProfile?.current_cv_id ?? null;

    let cvNeedsAsyncProcessing = false;

    // Verifikasi eksplisit kepemilikan CV terhadap candidate_cvs
    if (candidateCvId) {
      const { data: verifiedCv, error: verifyCvError } = await supabase
        .from("candidate_cvs")
        .select("id, candidate_id, processing_status")
        .eq("id", candidateCvId)
        .eq("candidate_id", user.id)
        .maybeSingle();

      if (verifyCvError || !verifiedCv) {
        return {
          success: false,
          error: "Dokumen CV aktif tidak valid atau bukan milik akun kamu.",
        };
      }

      if (
        verifiedCv.processing_status === "pending" ||
        verifiedCv.processing_status === "failed"
      ) {
        cvNeedsAsyncProcessing = true;
      }
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
      // Re-apply: update existing withdrawn record to pending AND update candidate_cv_id snapshot to current valid CV
      const { data: updatedApp, error: updateError } = await supabase
        .from("applications")
        .update({
          message: finalStoredMessage,
          match_score: serverMatchScore,
          candidate_cv_id: candidateCvId,
          status: "pending",
          created_at: new Date().toISOString(),
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
          candidate_cv_id: candidateCvId,
          status: "pending",
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

    if (candidateCvId && cvNeedsAsyncProcessing) {
      const targetUserId = user.id;
      after(async () => {
        await processCandidateCv(candidateCvId, targetUserId);
      });
    }

    revalidatePath("/talent/projects");
    revalidatePath(`/talent/projects/${projectId}`);
    revalidatePath("/talent/applications");
    revalidatePath("/talent/dashboard");
    revalidatePath("/vendor/dashboard");
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

    if (app.status !== "pending") {
      return {
        success: false,
        error: `Lamaran berstatus '${app.status}' sudah tidak dapat dibatalkan secara mandiri.`,
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
        message,
        match_score,
        candidate_cv_id,
        created_at,
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
      message: string | null;
      match_score: number | null;
      candidate_cv_id: string | null;
      created_at: string;
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

    const cvIds = Array.from(
      new Set(
        rawList
          .map((app) => app.candidate_cv_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const cvMap = new Map<
      string,
      { original_filename: string; processing_status: CvProcessingStatus }
    >();
    if (cvIds.length > 0) {
      const { data: cvsData } = await supabase
        .from("candidate_cvs")
        .select("id, original_filename, processing_status")
        .in("id", cvIds);

      for (const cv of cvsData || []) {
        cvMap.set(cv.id, {
          original_filename: cv.original_filename,
          processing_status: cv.processing_status as CvProcessingStatus,
        });
      }
    }

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

      const attachedCv = app.candidate_cv_id ? cvMap.get(app.candidate_cv_id) : undefined;
      let screeningStatus: ScreeningStatus = "completed";
      if (attachedCv) {
        if (attachedCv.processing_status === "pending") {
          screeningStatus = "queued";
        } else if (attachedCv.processing_status === "processing") {
          screeningStatus = "processing";
        } else if (attachedCv.processing_status === "failed") {
          screeningStatus = "failed";
        } else if (attachedCv.processing_status === "needs_ocr") {
          screeningStatus = "needs_review";
        } else {
          screeningStatus = "completed";
        }
      } else if (app.match_score === null) {
        screeningStatus = "queued";
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
        matchScore: app.match_score,
        status: app.status,
        screeningStatus,
        candidateCvFilename: attachedCv?.original_filename ?? null,
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
 * and fetch current CV & profile readiness for the Apply dialog
 */
export async function getApplicationForProject(projectId: string): Promise<{
  application: {
    id: string;
    status: ApplicationStatus;
    matchScore: number | null;
    candidateCvFilename: string | null;
    screeningStatus: ScreeningStatus;
  } | null;
  readiness: TalentApplyReadiness;
}> {
  const defaultReadiness: TalentApplyReadiness = {
    hasHeadlineAndLocation: false,
    hasSkills: false,
    currentCv: null,
  };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { application: null, readiness: defaultReadiness };
    }

    const [tpRes, skillsRes] = await Promise.all([
      supabase
        .from("talent_profiles")
        .select("headline, location, current_cv_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("talent_skills")
        .select("skill_id")
        .eq("talent_id", user.id)
        .limit(1),
    ]);

    let currentCv: TalentApplyReadiness["currentCv"] = null;
    if (tpRes.data?.current_cv_id) {
      const { data: cvRow } = await supabase
        .from("candidate_cvs")
        .select("id, original_filename, processing_status")
        .eq("id", tpRes.data.current_cv_id)
        .eq("candidate_id", user.id)
        .maybeSingle();

      if (cvRow) {
        currentCv = {
          id: cvRow.id,
          originalFilename: cvRow.original_filename,
          processingStatus: cvRow.processing_status as CvProcessingStatus,
        };
      }
    }

    const readiness: TalentApplyReadiness = {
      hasHeadlineAndLocation: Boolean(
        tpRes.data?.headline?.trim() && tpRes.data?.location?.trim(),
      ),
      hasSkills: (skillsRes.data?.length ?? 0) > 0,
      currentCv,
    };

    const idValidation = uuidSchema.safeParse(projectId);
    if (!idValidation.success) {
      return { application: null, readiness };
    }

    const { data: app } = await supabase
      .from("applications")
      .select("id, status, match_score, candidate_cv_id")
      .eq("project_id", projectId)
      .eq("talent_id", user.id)
      .maybeSingle();

    if (!app) {
      return { application: null, readiness };
    }

    let snapshotFilename: string | null = null;
    let screeningStatus: ScreeningStatus = "completed";

    if (app.candidate_cv_id) {
      const { data: snapCv } = await supabase
        .from("candidate_cvs")
        .select("original_filename, processing_status")
        .eq("id", app.candidate_cv_id)
        .maybeSingle();

      if (snapCv) {
        snapshotFilename = snapCv.original_filename;
        if (snapCv.processing_status === "pending") screeningStatus = "queued";
        else if (snapCv.processing_status === "processing") screeningStatus = "processing";
        else if (snapCv.processing_status === "failed") screeningStatus = "failed";
        else if (snapCv.processing_status === "needs_ocr") screeningStatus = "needs_review";
      }
    }

    return {
      application: {
        id: app.id,
        status: app.status as ApplicationStatus,
        matchScore: app.match_score,
        candidateCvFilename: snapshotFilename,
        screeningStatus,
      },
      readiness,
    };
  } catch {
    return { application: null, readiness: defaultReadiness };
  }
}
