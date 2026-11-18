"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  talentProfileUpdateSchema,
  talentSkillsUpdateSchema,
  type TalentProfileUpdateInput,
  type TalentSkillsUpdateInput,
} from "@/lib/validators/talent";
import type {
  CandidateCv,
  Skill,
  TalentSkill,
  TalentProfile,
  SkillLevel,
} from "@/types/database";

export interface TalentReceivedReview {
  id: string;
  rating: number;
  quality: number | null;
  timeliness: number | null;
  communication: number | null;
  comment: string | null;
  createdAt: string;
  vendorName: string;
  projectTitle: string;
}

export interface TalentProfilePageData {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  talentProfile: TalentProfile | null;
  currentCv: CandidateCv | null;
  talentSkills: (TalentSkill & { skill: Skill })[];
  masterSkills: Skill[];
  reviews: TalentReceivedReview[];
  ratingStats: {
    avgRating: number | null;
    reviewCount: number;
    completedProjectsCount: number;
  };
}

export async function getTalentProfileData(): Promise<{
  data: TalentProfilePageData | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: "Sesi telah berakhir. Silakan login kembali." };
    }

    // 1. Fetch profile & talent_profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "talent") {
      return { data: null, error: "Halaman profil hanya tersedia untuk akun Talent." };
    }

    const { data: talentProfile } = await supabase
      .from("talent_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    let currentCv: CandidateCv | null = null;
    if (talentProfile?.current_cv_id) {
      const { data: cv, error: cvError } = await supabase
        .from("candidate_cvs")
        .select("id, candidate_id, original_filename, file_size_bytes, processing_status, processing_error, uploaded_at, processed_at")
        .eq("id", talentProfile.current_cv_id)
        .maybeSingle();

      if (cvError) {
        console.error("Fetch current CV error:", cvError);
        return { data: null, error: "Gagal memuat status CV." };
      }
      currentCv = cv as CandidateCv | null;
    }

    // 2. Fetch talent_skills with skill metadata
    const { data: talentSkillsData } = await supabase
      .from("talent_skills")
      .select("talent_id, skill_id, level, skills(id, name, category)")
      .eq("talent_id", user.id);

    type TalentSkillJoinRow = {
      talent_id: string;
      skill_id: number;
      level: SkillLevel;
      skills: Skill;
    };

    const rows = (talentSkillsData || []) as unknown as TalentSkillJoinRow[];

    const talentSkills = rows.map((item) => {
      const skillObj = Array.isArray(item.skills) ? item.skills[0] : item.skills;
      return {
        talent_id: item.talent_id,
        skill_id: item.skill_id,
        level: item.level,
        skill: skillObj,
      };
    });

    // 3. Fetch master skills list
    const { data: masterSkills } = await supabase
      .from("skills")
      .select("id, name, category")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    // 4. Fetch received reviews & rating stats for talent
    const [reviewsRes, ratingRes, completedAppsRes] = await Promise.all([
      supabase
        .from("reviews")
        .select(`
          id,
          rating,
          quality,
          timeliness,
          communication,
          comment,
          created_at,
          vendor_profiles:vendor_id (
            organization_name
          ),
          applications:application_id (
            projects:project_id (
              title
            )
          )
        `)
        .eq("talent_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("talent_ratings")
        .select("avg_rating, review_count")
        .eq("talent_id", user.id)
        .maybeSingle(),
      supabase
        .from("applications")
        .select("id")
        .eq("talent_id", user.id)
        .eq("status", "completed"),
    ]);

    type RawReviewRow = {
      id: string;
      rating: number;
      quality: number | null;
      timeliness: number | null;
      communication: number | null;
      comment: string | null;
      created_at: string;
      vendor_profiles?: { organization_name: string } | { organization_name: string }[] | null;
      applications?: { projects?: { title: string } | { title: string }[] | null } | { projects?: { title: string } | { title: string }[] | null }[] | null;
    };

    const reviews: TalentReceivedReview[] = ((reviewsRes.data || []) as unknown as RawReviewRow[]).map((r) => {
      const vObj = Array.isArray(r.vendor_profiles) ? r.vendor_profiles[0] : r.vendor_profiles;
      const aObj = Array.isArray(r.applications) ? r.applications[0] : r.applications;
      const pObj = Array.isArray(aObj?.projects) ? aObj?.projects[0] : aObj?.projects;

      return {
        id: r.id,
        rating: r.rating,
        quality: r.quality,
        timeliness: r.timeliness,
        communication: r.communication,
        comment: r.comment,
        createdAt: r.created_at,
        vendorName: vObj?.organization_name || "Organisasi Vendor",
        projectTitle: pObj?.title || "Proyek Selesai",
      };
    });

    const avgRatingVal = ratingRes.data?.avg_rating != null ? Number(ratingRes.data.avg_rating) : null;
    const reviewCountVal = ratingRes.data?.review_count || 0;
    const completedCountVal = (completedAppsRes.data || []).length;

    return {
      data: {
        user: {
          id: user.id,
          email: user.email || "",
          fullName: profile?.full_name || user.user_metadata?.full_name || "Talent",
        },
        talentProfile: talentProfile as TalentProfile | null,
        currentCv,
        talentSkills,
        masterSkills: (masterSkills || []) as Skill[],
        reviews,
        ratingStats: {
          avgRating: avgRatingVal,
          reviewCount: reviewCountVal,
          completedProjectsCount: completedCountVal,
        },
      },
      error: null,
    };
  } catch (err: unknown) {
    console.error("Error fetching talent profile:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Gagal memuat profil talent.",
    };
  }
}

export async function updateTalentProfile(
  rawInput: TalentProfileUpdateInput
): Promise<{ success: boolean; error: string | null }> {
  try {
    const parseResult = talentProfileUpdateSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Data profil tidak valid.";
      return { success: false, error: firstError };
    }
    const validated = parseResult.data;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Kamu harus login untuk memperbarui profil." };
    }

    // Ensure user has role 'talent'
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile role lookup error:", profileError);
      return { success: false, error: "Gagal memverifikasi akun Talent." };
    }

    if (profile && profile.role !== "talent") {
      return {
        success: false,
        error: "Akses ditolak. Akun ini terdaftar sebagai Vendor, bukan Talenta.",
      };
    }

    if (!profile) {
      const { error: createProfileError } = await supabase.from("profiles").upsert({
        id: user.id,
        role: "talent",
        full_name: validated.fullName,
      });
      if (createProfileError) {
        console.error("Create candidate profile error:", createProfileError);
        return { success: false, error: "Gagal membuat profil Talent." };
      }
    }

    const { error: upsertError } = await supabase.rpc("save_candidate_profile", {
      p_full_name: validated.fullName,
      p_headline: validated.headline,
      p_bio: validated.bio || null,
      p_education: validated.education,
      p_education_history: validated.educationHistory,
      p_work_experience: validated.workExperience,
      p_location: validated.location,
      p_hours_per_week: validated.hoursPerWeek,
      p_preferred_mode: validated.preferredMode,
      p_is_available: validated.isAvailable,
      p_portfolio_urls: validated.portfolioUrls,
    });

    if (upsertError) {
      console.error("Candidate profile save error:", upsertError);
      return { success: false, error: upsertError.message };
    }

    revalidatePath("/talent/profile");
    revalidatePath("/talent/dashboard");
    return { success: true, error: null };
  } catch (err: unknown) {
    console.error("Validation or server error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan data profil.",
    };
  }
}

export async function updateTalentSkills(
  rawInput: TalentSkillsUpdateInput
): Promise<{ success: boolean; error: string | null }> {
  try {
    const parseResult = talentSkillsUpdateSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Data keahlian tidak valid.";
      return { success: false, error: firstError };
    }
    const validated = parseResult.data;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Kamu harus login untuk memperbarui keahlian." };
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
        error: "Akses ditolak. Fitur pengelolaan keahlian hanya untuk akun Talenta.",
      };
    }

    // Verify that all skills belong to the master skills list (talent cannot create skills outside master list)
    if (validated.skills.length > 0) {
      const { data: dbSkills, error: dbSkillsError } = await supabase
        .from("skills")
        .select("id");

      if (dbSkillsError) {
        console.error("Fetch master skills error:", dbSkillsError);
        return { success: false, error: "Gagal memverifikasi master list keahlian." };
      }

      const validSkillIds = new Set((dbSkills || []).map((s) => s.id));
      const hasInvalidSkill = validated.skills.some((s) => !validSkillIds.has(s.skillId));

      if (hasInvalidSkill) {
        return {
          success: false,
          error: "Keahlian harus dipilih dari master list terdaftar dan tidak boleh membuat skill baru.",
        };
      }
    }

    // 1. Delete existing talent_skills
    const { error: deleteError } = await supabase
      .from("talent_skills")
      .delete()
      .eq("talent_id", user.id);

    if (deleteError) {
      console.error("Delete skills error:", deleteError);
      return { success: false, error: deleteError.message };
    }

    // 2. Insert new skills if array is not empty (deduplicated)
    if (validated.skills.length > 0) {
      const uniqueSkillsMap = new Map<number, SkillLevel>();
      for (const s of validated.skills) {
        uniqueSkillsMap.set(s.skillId, s.level);
      }

      const rowsToInsert = Array.from(uniqueSkillsMap.entries()).map(([skillId, level]) => ({
        talent_id: user.id,
        skill_id: skillId,
        level,
      }));

      const { error: insertError } = await supabase
        .from("talent_skills")
        .insert(rowsToInsert);

      if (insertError) {
        console.error("Insert skills error:", insertError);
        return { success: false, error: insertError.message };
      }
    }

    revalidatePath("/talent/profile");
    revalidatePath("/talent/dashboard");
    return { success: true, error: null };
  } catch (err: unknown) {
    console.error("Validation or skills update error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui keahlian.",
    };
  }
}
