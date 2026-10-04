"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { applyApplicationSchema, uuidSchema } from "@/lib/validators/application";
import { calculateMatch } from "@/lib/matching";
import { getTalentMatchingContext } from "@/app/talent/projects/actions";
import type { ProjectContext, ProjectSkill, SkillLevel } from "@/lib/matching/types";
import type { ApplicationStatus, ProjectDifficulty, ProjectType, WorkMode } from "@/types/database";

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
  message: string | null;
  contactEmail: string | null;
  createdAt: string;
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
      .select("id, title, status, hours_per_week, mode, vendor_id")
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
        matchScore: app.match_score,
        status: app.status,
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
  application: { id: string; status: ApplicationStatus; matchScore: number | null } | null;
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
      .select("id, status, match_score")
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
        matchScore: app.match_score,
      },
    };
  } catch {
    return { application: null };
  }
}
