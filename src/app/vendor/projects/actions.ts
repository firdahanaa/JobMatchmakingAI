"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  projectSchema,
  projectStatusUpdateSchema,
  uuidSchema,
  type ProjectInput,
} from "@/lib/validators/project";
import type {
  Project,
  ProjectSkill,
  Skill,
} from "@/types/database";

export interface VendorProjectWithStats extends Project {
  applicantCount: number;
  skills: (ProjectSkill & { skill: Skill })[];
}

export interface ProjectDetailData {
  project: Project;
  skills: (ProjectSkill & { skill: Skill })[];
  masterSkills: Skill[];
}

export interface ProjectApplicantItem {
  id: string;
  projectId: string;
  talentId: string;
  status: string;
  message: string | null;
  matchScore: number | null;
  createdAt: string;
  talentName: string;
  talentHeadline: string | null;
  talentAvatar: string | null;
  talentEducation: string | null;
}

/**
 * Fetch master list of skills
 */
export async function getMasterSkills(): Promise<{
  data: Skill[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("skills")
      .select("id, name, category")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return { data: (data || []) as Skill[], error: null };
  } catch (err: unknown) {
    console.error("Error fetching master skills:", err);
    return {
      data: [],
      error: err instanceof Error ? err.message : "Gagal memuat master skills.",
    };
  }
}

/**
 * Get all projects created by the logged-in vendor with applicant count
 */
export async function getVendorProjects(): Promise<{
  data: VendorProjectWithStats[];
  user: { id: string; email: string; organizationName: string } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        data: [],
        user: null,
        error: "Sesi telah berakhir. Silakan login kembali.",
      };
    }

    // Role verification (defense in depth)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "vendor") {
      return {
        data: [],
        user: null,
        error: "Akses ditolak. Fitur ini hanya untuk pengguna Vendor.",
      };
    }

    // Get vendor profile for organization name
    const { data: vendorProfile } = await supabase
      .from("vendor_profiles")
      .select("organization_name")
      .eq("user_id", user.id)
      .maybeSingle();

    // Fetch projects
    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .eq("vendor_id", user.id)
      .order("created_at", { ascending: false });

    if (projectsError) throw projectsError;

    if (!projectsData || projectsData.length === 0) {
      return {
        data: [],
        user: {
          id: user.id,
          email: user.email || "",
          organizationName: vendorProfile?.organization_name || "Vendor",
        },
        error: null,
      };
    }

    const projectIds = projectsData.map((p) => p.id);

    // Fetch applicant counts
    const { data: applicationsData } = await supabase
      .from("applications")
      .select("project_id")
      .in("project_id", projectIds);

    const countMap: Record<string, number> = {};
    for (const app of applicationsData || []) {
      countMap[app.project_id] = (countMap[app.project_id] || 0) + 1;
    }

    // Fetch skills for these projects
    const { data: projectSkillsData } = await supabase
      .from("project_skills")
      .select("project_id, skill_id, min_level, is_required, skills(id, name, category)")
      .in("project_id", projectIds);

    type ProjectSkillJoin = {
      project_id: string;
      skill_id: number;
      min_level: ProjectSkill["min_level"];
      is_required: boolean;
      skills: Skill | Skill[];
    };

    const projectSkillsMap: Record<string, (ProjectSkill & { skill: Skill })[]> = {};
    for (const row of (projectSkillsData || []) as unknown as ProjectSkillJoin[]) {
      const skillObj = Array.isArray(row.skills) ? row.skills[0] : row.skills;
      if (!projectSkillsMap[row.project_id]) {
        projectSkillsMap[row.project_id] = [];
      }
      projectSkillsMap[row.project_id].push({
        project_id: row.project_id,
        skill_id: row.skill_id,
        min_level: row.min_level,
        is_required: row.is_required,
        skill: skillObj,
      });
    }

    const result: VendorProjectWithStats[] = projectsData.map((p) => ({
      ...p,
      applicantCount: countMap[p.id] || 0,
      skills: projectSkillsMap[p.id] || [],
    }));

    return {
      data: result,
      user: {
        id: user.id,
        email: user.email || "",
        organizationName: vendorProfile?.organization_name || "Vendor",
      },
      error: null,
    };
  } catch (err: unknown) {
    console.error("Error fetching vendor projects:", err);
    return {
      data: [],
      user: null,
      error: err instanceof Error ? err.message : "Gagal memuat daftar proyek vendor.",
    };
  }
}

/**
 * Fetch a single project for editing (with authorization check)
 */
export async function getProjectForEdit(projectId: string): Promise<{
  data: ProjectDetailData | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: "Kamu harus login untuk mengakses proyek ini." };
    }

    // Input validation
    const idValidation = uuidSchema.safeParse(projectId);
    if (!idValidation.success) {
      return { data: null, error: "ID proyek tidak valid." };
    }

    // Role verification
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "vendor") {
      return { data: null, error: "Akses ditolak. Hanya vendor yang dapat mengelola proyek." };
    }

    // 1. Fetch project and verify ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) {
      return { data: null, error: "Proyek tidak ditemukan." };
    }

    if (project.vendor_id !== user.id) {
      return {
        data: null,
        error: "Kamu tidak memiliki izin untuk mengedit proyek ini.",
      };
    }

    // 2. Fetch project skills
    const { data: projectSkillsData } = await supabase
      .from("project_skills")
      .select("project_id, skill_id, min_level, is_required, skills(id, name, category)")
      .eq("project_id", projectId);

    type ProjectSkillJoin = {
      project_id: string;
      skill_id: number;
      min_level: ProjectSkill["min_level"];
      is_required: boolean;
      skills: Skill | Skill[];
    };

    const skills = ((projectSkillsData || []) as unknown as ProjectSkillJoin[]).map(
      (row) => ({
        project_id: row.project_id,
        skill_id: row.skill_id,
        min_level: row.min_level,
        is_required: row.is_required,
        skill: Array.isArray(row.skills) ? row.skills[0] : row.skills,
      })
    );

    // 3. Fetch master skills
    const { data: masterSkills } = await supabase
      .from("skills")
      .select("id, name, category")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    return {
      data: {
        project: project as Project,
        skills,
        masterSkills: (masterSkills || []) as Skill[],
      },
      error: null,
    };
  } catch (err: unknown) {
    console.error("Error fetching project for edit:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Gagal memuat detail proyek.",
    };
  }
}

/**
 * Create a new project with required skills
 */
export async function createProject(
  rawInput: ProjectInput
): Promise<{ success: boolean; projectId?: string; error: string | null }> {
  try {
    const parseResult = projectSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.issues[0]?.message || "Data proyek tidak valid.",
      };
    }
    const validated = parseResult.data;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Kamu harus login untuk membuat proyek." };
    }

    // Role verification: strictly require vendor role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "vendor") {
      return {
        success: false,
        error: "Akses ditolak. Hanya akun Vendor terdaftar yang dapat membuat proyek.",
      };
    }

    // Ensure vendor profile exists
    const { data: existingVendor } = await supabase
      .from("vendor_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingVendor) {
      await supabase.from("vendor_profiles").upsert({
        user_id: user.id,
        organization_name:
          user.user_metadata?.full_name ||
          user.user_metadata?.organization_name ||
          "Organisasi Vendor",
      });
    }

    // Verify all skill IDs exist in skills table
    const { data: dbSkills } = await supabase.from("skills").select("id");
    const validSkillIds = new Set((dbSkills || []).map((s) => s.id));
    const invalidSkill = validated.skills.find((s) => !validSkillIds.has(s.skillId));
    if (invalidSkill) {
      return {
        success: false,
        error: "Terdapat keahlian yang tidak valid atau di luar master list.",
      };
    }

    // 1. Insert Project
    const { data: newProject, error: projectInsertError } = await supabase
      .from("projects")
      .insert({
        vendor_id: user.id,
        title: validated.title,
        description: validated.description,
        difficulty: validated.difficulty,
        type: validated.type,
        mode: validated.mode,
        duration_weeks: validated.durationWeeks || null,
        hours_per_week: validated.hoursPerWeek || null,
        reward_amount: validated.rewardAmount ?? 0,
        reward_note: validated.rewardNote || null,
        deadline: validated.deadline || null,
        status: validated.status || "open",
      })
      .select("id")
      .single();

    if (projectInsertError || !newProject) {
      console.error("Insert project error:", projectInsertError);
      return {
        success: false,
        error: projectInsertError?.message || "Gagal membuat proyek baru.",
      };
    }

    // 2. Insert Project Skills (deduplicated by skillId)
    const uniqueSkillsMap = new Map<number, (typeof validated.skills)[0]>();
    for (const skillItem of validated.skills) {
      uniqueSkillsMap.set(skillItem.skillId, skillItem);
    }

    const skillRows = Array.from(uniqueSkillsMap.values()).map((item) => ({
      project_id: newProject.id,
      skill_id: item.skillId,
      min_level: item.minLevel,
      is_required: item.isRequired,
    }));

    const { error: skillsInsertError } = await supabase
      .from("project_skills")
      .insert(skillRows);

    if (skillsInsertError) {
      console.error("Insert project skills error:", skillsInsertError);
      // Clean up orphaned project if skill insertion failed
      await supabase.from("projects").delete().eq("id", newProject.id);
      return {
        success: false,
        error: "Gagal menyimpan daftar keahlian proyek. Proyek dibatalkan.",
      };
    }

    revalidatePath("/vendor/dashboard");
    return { success: true, projectId: newProject.id, error: null };
  } catch (err: unknown) {
    console.error("Create project error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat membuat proyek.",
    };
  }
}

/**
 * Update existing project and replace its skills
 */
export async function updateProject(
  projectId: string,
  rawInput: ProjectInput
): Promise<{ success: boolean; error: string | null }> {
  try {
    const parseResult = projectSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.issues[0]?.message || "Data proyek tidak valid.",
      };
    }
    const validated = parseResult.data;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Kamu harus login untuk mengubah proyek." };
    }

    // Input validation
    const idValidation = uuidSchema.safeParse(projectId);
    if (!idValidation.success) {
      return { success: false, error: "ID proyek tidak valid." };
    }

    // Role verification
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "vendor") {
      return {
        success: false,
        error: "Akses ditolak. Hanya akun Vendor yang dapat memperbarui proyek.",
      };
    }

    // Verify ownership (Double check RLS + server action authorization)
    const { data: existingProject, error: checkError } = await supabase
      .from("projects")
      .select("vendor_id")
      .eq("id", projectId)
      .maybeSingle();

    if (checkError || !existingProject) {
      return { success: false, error: "Proyek tidak ditemukan." };
    }

    if (existingProject.vendor_id !== user.id) {
      return {
        success: false,
        error: "Kamu tidak memiliki hak untuk mengubah proyek ini.",
      };
    }

    // Verify all skills exist
    const { data: dbSkills } = await supabase.from("skills").select("id");
    const validSkillIds = new Set((dbSkills || []).map((s) => s.id));
    const invalidSkill = validated.skills.find((s) => !validSkillIds.has(s.skillId));
    if (invalidSkill) {
      return {
        success: false,
        error: "Terdapat keahlian yang tidak terdaftar dalam master list.",
      };
    }

    // 1. Update Project fields
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        title: validated.title,
        description: validated.description,
        difficulty: validated.difficulty,
        type: validated.type,
        mode: validated.mode,
        duration_weeks: validated.durationWeeks || null,
        hours_per_week: validated.hoursPerWeek || null,
        reward_amount: validated.rewardAmount ?? 0,
        reward_note: validated.rewardNote || null,
        deadline: validated.deadline || null,
        status: validated.status || "open",
      })
      .eq("id", projectId)
      .eq("vendor_id", user.id);

    if (updateError) {
      console.error("Update project error:", updateError);
      return { success: false, error: updateError.message };
    }

    // 2. Safe replace-all project_skills
    // A) Delete existing project_skills
    const { error: deleteSkillsError } = await supabase
      .from("project_skills")
      .delete()
      .eq("project_id", projectId);

    if (deleteSkillsError) {
      console.error("Delete project skills error:", deleteSkillsError);
      return { success: false, error: "Gagal memperbarui keahlian proyek." };
    }

    // B) Insert new project_skills
    const uniqueSkillsMap = new Map<number, (typeof validated.skills)[0]>();
    for (const skillItem of validated.skills) {
      uniqueSkillsMap.set(skillItem.skillId, skillItem);
    }

    const skillRows = Array.from(uniqueSkillsMap.values()).map((item) => ({
      project_id: projectId,
      skill_id: item.skillId,
      min_level: item.minLevel,
      is_required: item.isRequired,
    }));

    const { error: insertSkillsError } = await supabase
      .from("project_skills")
      .insert(skillRows);

    if (insertSkillsError) {
      console.error("Insert updated skills error:", insertSkillsError);
      return { success: false, error: "Gagal menyimpan keahlian baru proyek." };
    }

    revalidatePath("/vendor/dashboard");
    revalidatePath(`/vendor/projects/${projectId}/edit`);
    return { success: true, error: null };
  } catch (err: unknown) {
    console.error("Update project error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui proyek.",
    };
  }
}

/**
 * Update project status (open, closed, completed)
 */
export async function updateProjectStatus(
  projectId: string,
  newStatus: "open" | "closed" | "completed"
): Promise<{ success: boolean; error: string | null }> {
  try {
    const parseResult = projectStatusUpdateSchema.safeParse({ status: newStatus });
    if (!parseResult.success) {
      return { success: false, error: "Status proyek tidak valid." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Kamu harus login untuk mengubah status." };
    }

    // Input validation
    const idValidation = uuidSchema.safeParse(projectId);
    if (!idValidation.success) {
      return { success: false, error: "ID proyek tidak valid." };
    }

    // Role verification
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "vendor") {
      return {
        success: false,
        error: "Akses ditolak. Hanya akun Vendor yang dapat mengubah status proyek.",
      };
    }

    // Authorization check: verify vendor ownership
    const { data: project } = await supabase
      .from("projects")
      .select("vendor_id, status")
      .eq("id", projectId)
      .maybeSingle();

    if (!project || project.vendor_id !== user.id) {
      return {
        success: false,
        error: "Kamu tidak memiliki izin untuk mengubah status proyek ini.",
      };
    }

    const { error: updateError } = await supabase
      .from("projects")
      .update({ status: newStatus })
      .eq("id", projectId)
      .eq("vendor_id", user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath("/vendor/dashboard");
    return { success: true, error: null };
  } catch (err: unknown) {
    console.error("Error updating project status:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mengubah status proyek.",
    };
  }
}

/**
 * Delete a project (with confirmation dialog & vendor ownership check)
 */
export async function deleteProject(
  projectId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Kamu harus login untuk menghapus proyek." };
    }

    // Input validation
    const idValidation = uuidSchema.safeParse(projectId);
    if (!idValidation.success) {
      return { success: false, error: "ID proyek tidak valid." };
    }

    // Role verification
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "vendor") {
      return {
        success: false,
        error: "Akses ditolak. Hanya akun Vendor yang dapat menghapus proyek.",
      };
    }

    // Check ownership explicitly before deleting
    const { data: project, error: checkError } = await supabase
      .from("projects")
      .select("vendor_id, title")
      .eq("id", projectId)
      .maybeSingle();

    if (checkError || !project) {
      return { success: false, error: "Proyek tidak ditemukan." };
    }

    if (project.vendor_id !== user.id) {
      return {
        success: false,
        error: "Kamu tidak berhak menghapus proyek milik vendor lain.",
      };
    }

    // Delete project (cascade removes project_skills and applications)
    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("vendor_id", user.id);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    revalidatePath("/vendor/dashboard");
    return { success: true, error: null };
  } catch (err: unknown) {
    console.error("Error deleting project:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menghapus proyek.",
    };
  }
}

/**
 * Fetch applicants for a specific project
 */
export async function getProjectApplicants(projectId: string): Promise<{
  projectTitle: string;
  applicants: ProjectApplicantItem[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { projectTitle: "", applicants: [], error: "Silakan login terlebih dahulu." };
    }

    // Input validation
    const idValidation = uuidSchema.safeParse(projectId);
    if (!idValidation.success) {
      return { projectTitle: "", applicants: [], error: "ID proyek tidak valid." };
    }

    // Role verification
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "vendor") {
      return { projectTitle: "", applicants: [], error: "Akses ditolak. Hanya akun Vendor yang dapat melihat pelamar." };
    }

    // Verify vendor ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("vendor_id, title")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project || project.vendor_id !== user.id) {
      return { projectTitle: "", applicants: [], error: "Proyek tidak ditemukan atau akses ditolak." };
    }

    const { data: applications, error: appsError } = await supabase
      .from("applications")
      .select(`
        id,
        project_id,
        talent_id,
        status,
        message,
        match_score,
        created_at,
        talent_profiles (
          headline,
          education
        ),
        profiles:talent_id (
          full_name,
          avatar_url
        )
      `)
      .eq("project_id", projectId)
      .order("match_score", { ascending: false });

    if (appsError) throw appsError;

    type AppRow = {
      id: string;
      project_id: string;
      talent_id: string;
      status: string;
      message: string | null;
      match_score: number | null;
      created_at: string;
      talent_profiles: { headline: string | null; education: string | null } | null;
      profiles: { full_name: string | null; avatar_url: string | null } | null;
    };

    const applicantItems: ProjectApplicantItem[] = (
      (applications || []) as unknown as AppRow[]
    ).map((a) => ({
      id: a.id,
      projectId: a.project_id,
      talentId: a.talent_id,
      status: a.status,
      message: a.message,
      matchScore: a.match_score,
      createdAt: a.created_at,
      talentName: a.profiles?.full_name || "Talent",
      talentHeadline: a.talent_profiles?.headline || null,
      talentAvatar: a.profiles?.avatar_url || null,
      talentEducation: a.talent_profiles?.education || null,
    }));

    return {
      projectTitle: project.title,
      applicants: applicantItems,
      error: null,
    };
  } catch (err: unknown) {
    console.error("Error fetching applicants:", err);
    return {
      projectTitle: "",
      applicants: [],
      error: err instanceof Error ? err.message : "Gagal memuat daftar pelamar.",
    };
  }
}
