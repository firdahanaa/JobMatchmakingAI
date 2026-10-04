"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calculateMatch, calculateSkillGap } from "@/lib/matching";
import { updateApplicationStatusSchema, uuidSchema } from "@/lib/validators/application";
import { reviewSchema, type ReviewInput } from "@/lib/validators/review";
import type {
  TalentContext,
  ProjectContext,
  TalentSkill as MatchingTalentSkill,
  ProjectSkill as MatchingProjectSkill,
  SkillLevel,
} from "@/lib/matching/types";
import type {
  ApplicationStatus,
  ProjectDifficulty,
  ProjectType,
  WorkMode,
  TalentProfile,
} from "@/types/database";

export interface DetailedApplicantItem {
  id: string; // application id
  projectId: string;
  talentId: string;
  status: ApplicationStatus;
  message: string | null;
  contactEmail: string | null;
  createdAt: string;

  // Talent Basic Info
  talentName: string;
  talentAvatar: string | null;
  headline: string | null;
  education: string | null;
  bio: string | null;
  location: string | null;
  hoursPerWeek: number | null;
  preferredMode: WorkMode | null;
  isAvailable: boolean;
  portfolioUrls: string[];

  // Recalculated matching with latest data
  latestMatchScore: number;
  snapshotMatchScore: number | null;
  matchBreakdown: {
    skill: number;
    levelFit: number;
    availability: number;
    rating: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  underLevelSkills: {
    name: string;
    has: SkillLevel;
    needs: SkillLevel;
  }[];
  explanation: string;

  // Ratings & Completed Projects
  avgRating: number | null;
  reviewCount: number;
  completedProjectsCount: number;

  // All talent skills for detailed modal
  allTalentSkills: {
    skillId: number;
    name: string;
    category: string;
    level: SkillLevel;
  }[];

  // Reviews history
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    vendorName?: string;
  }[];

  // Review given by current vendor for this application (if completed)
  review: {
    id: string;
    rating: number;
    quality: number | null;
    timeliness: number | null;
    communication: number | null;
    comment: string | null;
    createdAt: string;
  } | null;
}

export interface ProjectApplicantsData {
  project: {
    id: string;
    title: string;
    status: string;
    difficulty: ProjectDifficulty;
    type: ProjectType;
    mode: WorkMode;
    hoursPerWeek: number | null;
    rewardAmount: number | null;
    deadline: string | null;
  };
  applicants: DetailedApplicantItem[];
}

/**
 * Fetch project applicants with real-time recalculated match scores
 */
export async function getProjectApplicantsRecalculated(
  projectId: string
): Promise<{ data: ProjectApplicantsData | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: "Kamu harus login untuk melihat daftar pelamar." };
    }

    // Input validation
    const idValidation = uuidSchema.safeParse(projectId);
    if (!idValidation.success) {
      return { data: null, error: "ID proyek tidak valid." };
    }

    // Role verification (defense-in-depth)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "vendor") {
      return { data: null, error: "Akses ditolak. Hanya akun Vendor yang dapat melihat daftar pelamar." };
    }

    // 1. Ambil proyek dan verifikasi bahwa vendor adalah pemilik proyek
    const { data: rawProject, error: projectError } = await supabase
      .from("projects")
      .select(`
        id,
        vendor_id,
        title,
        status,
        difficulty,
        type,
        mode,
        hours_per_week,
        reward_amount,
        deadline,
        project_skills (
          skill_id,
          min_level,
          is_required,
          skills (
            id,
            name,
            category
          )
        )
      `)
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !rawProject) {
      return { data: null, error: "Proyek tidak ditemukan." };
    }

    if (rawProject.vendor_id !== user.id) {
      return { data: null, error: "Kamu tidak memiliki izin untuk melihat pelamar proyek ini." };
    }

    // Siapkan ProjectContext
    type RawProjectSkill = {
      skill_id: number;
      min_level: SkillLevel;
      is_required: boolean;
      skills: { id: number; name: string; category: string } | { id: number; name: string; category: string }[];
    };

    const pSkillsList = (rawProject.project_skills || []) as unknown as RawProjectSkill[];
    const matchingProjectSkills: MatchingProjectSkill[] = pSkillsList.map((ps) => {
      const sObj = Array.isArray(ps.skills) ? ps.skills[0] : ps.skills;
      return {
        skillId: ps.skill_id,
        name: sObj?.name || `Skill #${ps.skill_id}`,
        minLevel: ps.min_level,
        isRequired: ps.is_required,
      };
    });

    const projectContext: ProjectContext = {
      skills: matchingProjectSkills,
      hoursPerWeek: rawProject.hours_per_week,
      mode: rawProject.mode as WorkMode,
    };

    // 2. Ambil seluruh lamaran untuk proyek ini
    const { data: rawApplications, error: appsError } = await supabase
      .from("applications")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (appsError) {
      console.error("Error fetching applications:", appsError);
      return { data: null, error: "Gagal memuat lamaran pelamar." };
    }

    const apps = rawApplications || [];
    if (apps.length === 0) {
      return {
        data: {
          project: {
            id: rawProject.id,
            title: rawProject.title,
            status: rawProject.status,
            difficulty: rawProject.difficulty,
            type: rawProject.type,
            mode: rawProject.mode,
            hoursPerWeek: rawProject.hours_per_week,
            rewardAmount: rawProject.reward_amount,
            deadline: rawProject.deadline,
          },
          applicants: [],
        },
        error: null,
      };
    }

    const talentIds = apps.map((a) => a.talent_id);

    const appIds = apps.map((a) => a.id);

    // 3. Batch fetch data talenta (Anti N+1)
    const [
      profilesRes,
      talentProfilesRes,
      skillsRes,
      ratingsRes,
      completedAppsRes,
      reviewsRes,
      appReviewsRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id, full_name, avatar_url").in("id", talentIds),
      supabase.from("talent_profiles").select("*").in("user_id", talentIds),
      supabase
        .from("talent_skills")
        .select("talent_id, skill_id, level, skills(id, name, category)")
        .in("talent_id", talentIds),
      supabase.from("talent_ratings").select("talent_id, avg_rating, review_count").in("talent_id", talentIds),
      supabase
        .from("applications")
        .select("talent_id")
        .in("talent_id", talentIds)
        .eq("status", "completed"),
      supabase
        .from("reviews")
        .select("id, talent_id, rating, comment, created_at, vendor_profiles:vendor_id(organization_name)")
        .in("talent_id", talentIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("reviews")
        .select("id, application_id, rating, quality, timeliness, communication, comment, created_at")
        .in("application_id", appIds),
    ]);

    // Map profiles
    const profilesMap = new Map<string, { full_name: string; avatar_url: string | null }>();
    for (const p of profilesRes.data || []) {
      profilesMap.set(p.id, p);
    }

    // Map talent_profiles
    const talentProfilesMap = new Map<string, TalentProfile>();
    for (const tp of (talentProfilesRes.data || []) as unknown as TalentProfile[]) {
      talentProfilesMap.set(tp.user_id, tp);
    }

    // Map talent_skills
    type RawTalentSkill = {
      talent_id: string;
      skill_id: number;
      level: SkillLevel;
      skills: { id: number; name: string; category: string } | { id: number; name: string; category: string }[];
    };
    const skillsMap = new Map<string, RawTalentSkill[]>();
    for (const s of (skillsRes.data || []) as unknown as RawTalentSkill[]) {
      const arr = skillsMap.get(s.talent_id) || [];
      arr.push(s);
      skillsMap.set(s.talent_id, arr);
    }

    // Map talent_ratings
    const ratingsMap = new Map<string, { avg_rating: number; review_count: number }>();
    for (const r of ratingsRes.data || []) {
      ratingsMap.set(r.talent_id, {
        avg_rating: Number(r.avg_rating),
        review_count: r.review_count,
      });
    }

    // Map completed projects counts
    const completedCountMap = new Map<string, number>();
    for (const ca of completedAppsRes.data || []) {
      completedCountMap.set(ca.talent_id, (completedCountMap.get(ca.talent_id) || 0) + 1);
    }

    // Map reviews history
    type RawReview = {
      id: string;
      talent_id: string;
      rating: number;
      comment: string | null;
      created_at: string;
      vendor_profiles?: { organization_name: string } | { organization_name: string }[] | null;
    };
    const reviewsMap = new Map<string, RawReview[]>();
    for (const rev of (reviewsRes.data || []) as unknown as RawReview[]) {
      const arr = reviewsMap.get(rev.talent_id) || [];
      arr.push(rev);
      reviewsMap.set(rev.talent_id, arr);
    }

    // Map application reviews (reviews given for these specific applications)
    type RawAppReview = {
      id: string;
      application_id: string;
      rating: number;
      quality: number | null;
      timeliness: number | null;
      communication: number | null;
      comment: string | null;
      created_at: string;
    };
    const appReviewsMap = new Map<string, RawAppReview>();
    for (const ar of (appReviewsRes.data || []) as unknown as RawAppReview[]) {
      appReviewsMap.set(ar.application_id, ar);
    }

    // 4. Hitung ulang kecocokan (Real-time Recalculated Match Score) untuk setiap pelamar
    const applicantsList: DetailedApplicantItem[] = apps.map((app) => {
      const prof = profilesMap.get(app.talent_id);
      const tProf = talentProfilesMap.get(app.talent_id);
      const tSkills = skillsMap.get(app.talent_id) || [];
      const ratingInfo = ratingsMap.get(app.talent_id);
      const completedCount = completedCountMap.get(app.talent_id) || 0;
      const tReviews = reviewsMap.get(app.talent_id) || [];

      // Susun list skill talent
      const matchingTalentSkills: MatchingTalentSkill[] = tSkills.map((ts) => {
        const sObj = Array.isArray(ts.skills) ? ts.skills[0] : ts.skills;
        return {
          skillId: ts.skill_id,
          name: sObj?.name || `Skill #${ts.skill_id}`,
          level: ts.level,
        };
      });

      const allDetailedSkills = tSkills.map((ts) => {
        const sObj = Array.isArray(ts.skills) ? ts.skills[0] : ts.skills;
        return {
          skillId: ts.skill_id,
          name: sObj?.name || `Skill #${ts.skill_id}`,
          category: sObj?.category || "Lainnya",
          level: ts.level,
        };
      });

      // Context untuk matching
      const talentContext: TalentContext = {
        skills: matchingTalentSkills,
        hoursPerWeek: tProf?.hours_per_week ?? null,
        preferredMode: (tProf?.preferred_mode as WorkMode) ?? null,
        isAvailable: tProf?.is_available ?? true,
        avgRating: ratingInfo?.avg_rating ?? null,
      };

      // Hitung ulang kalkulasi skor dan skill gap
      const matchResult = calculateMatch(talentContext, projectContext);
      const skillGap = calculateSkillGap(talentContext, projectContext);

      // Ekstrak pesan dan kontak email (Privasi: email hanya terlihat oleh vendor setelah talent melamar)
      let cleanMsg = app.message || "";
      let contactEmail: string | null = null;

      if (cleanMsg.includes("[Kontak:")) {
        const match = cleanMsg.match(/\[Kontak:\s*([^\]]+)\]/);
        if (match) {
          contactEmail = match[1].trim();
          cleanMsg = cleanMsg.replace(/\[Kontak:\s*[^\]]+\]/, "").trim();
        }
      }

      const formattedReviews = tReviews.map((r) => {
        const vObj = Array.isArray(r.vendor_profiles)
          ? r.vendor_profiles[0]
          : r.vendor_profiles;
        return {
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.created_at,
          vendorName: vObj?.organization_name || "Vendor MatchWork AI",
        };
      });

      return {
        id: app.id,
        projectId: app.project_id,
        talentId: app.talent_id,
        status: app.status as ApplicationStatus,
        message: cleanMsg || null,
        contactEmail,
        createdAt: app.created_at,
        talentName: prof?.full_name || "Talenta",
        talentAvatar: prof?.avatar_url || null,
        headline: tProf?.headline || null,
        education: tProf?.education || null,
        bio: tProf?.bio || null,
        location: tProf?.location || null,
        hoursPerWeek: tProf?.hours_per_week ?? null,
        preferredMode: tProf?.preferred_mode ?? null,
        isAvailable: tProf?.is_available ?? true,
        portfolioUrls: tProf?.portfolio_urls || [],
        latestMatchScore: matchResult.score,
        snapshotMatchScore: app.match_score,
        matchBreakdown: matchResult.breakdown,
        matchedSkills: skillGap.matchedSkills,
        missingSkills: skillGap.missingSkills,
        underLevelSkills: skillGap.underLevelSkills,
        explanation: matchResult.explanation,
        avgRating: ratingInfo?.avg_rating ?? null,
        reviewCount: ratingInfo?.review_count || 0,
        completedProjectsCount: completedCount,
        allTalentSkills: allDetailedSkills,
        reviews: formattedReviews,
        review: (() => {
          const r = appReviewsMap.get(app.id);
          if (!r) return null;
          return {
            id: r.id,
            rating: r.rating,
            quality: r.quality,
            timeliness: r.timeliness,
            communication: r.communication,
            comment: r.comment,
            createdAt: r.created_at,
          };
        })(),
      };
    });

    // Urutkan pelamar berdasarkan skor terbaru secara descending
    applicantsList.sort((a, b) => {
      if (b.latestMatchScore !== a.latestMatchScore) {
        return b.latestMatchScore - a.latestMatchScore;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return {
      data: {
        project: {
          id: rawProject.id,
          title: rawProject.title,
          status: rawProject.status,
          difficulty: rawProject.difficulty,
          type: rawProject.type,
          mode: rawProject.mode,
          hoursPerWeek: rawProject.hours_per_week,
          rewardAmount: rawProject.reward_amount,
          deadline: rawProject.deadline,
        },
        applicants: applicantsList,
      },
      error: null,
    };
  } catch (err: unknown) {
    console.error("Error in getProjectApplicantsRecalculated:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat memproses data pelamar.",
    };
  }
}

/**
 * Update application status (Accept, Reject, Mark as Completed)
 * Rule: Saat Accept, ubah status project menjadi 'in_progress'
 */
export async function updateApplicantStatus(
  applicationId: string,
  projectId: string,
  newStatus: "accepted" | "rejected" | "completed"
): Promise<{ success: boolean; error: string | null }> {
  try {
    const parseResult = updateApplicationStatusSchema.safeParse({ status: newStatus });
    if (!parseResult.success) {
      return { success: false, error: "Status lamaran tidak valid." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Kamu harus login untuk mengubah status pelamar." };
    }

    // Input validation
    const appValidation = uuidSchema.safeParse(applicationId);
    const projValidation = uuidSchema.safeParse(projectId);
    if (!appValidation.success || !projValidation.success) {
      return { success: false, error: "ID lamaran atau ID proyek tidak valid." };
    }

    // Role verification
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "vendor") {
      return { success: false, error: "Akses ditolak. Hanya akun Vendor yang berwenang mengubah status pelamar." };
    }

    // 1. Cek kepemilikan proyek
    const { data: project, error: checkError } = await supabase
      .from("projects")
      .select("id, vendor_id, status")
      .eq("id", projectId)
      .maybeSingle();

    if (checkError || !project) {
      return { success: false, error: "Proyek tidak ditemukan." };
    }

    if (project.vendor_id !== user.id) {
      return {
        success: false,
        error: "Kamu tidak memiliki izin untuk mengubah status pelamar proyek ini.",
      };
    }

    // 2. Cek status lamaran saat ini
    const { data: existingApp, error: appCheckError } = await supabase
      .from("applications")
      .select("id, status")
      .eq("id", applicationId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (appCheckError || !existingApp) {
      return { success: false, error: "Lamaran tidak ditemukan pada proyek ini." };
    }

    if (existingApp.status === "withdrawn") {
      return {
        success: false,
        error: "Lamaran telah dibatalkan oleh talenta dan tidak dapat diubah statusnya.",
      };
    }

    // 2. Update status lamaran
    const { error: updateAppError } = await supabase
      .from("applications")
      .update({ status: newStatus })
      .eq("id", applicationId)
      .eq("project_id", projectId);

    if (updateAppError) {
      console.error("Error updating application status:", updateAppError);
      return { success: false, error: updateAppError.message || "Gagal mengubah status pelamar." };
    }

    // 3. Aturan sederhana: Saat Accept, ubah status project menjadi 'in_progress'
    if (newStatus === "accepted") {
      await supabase
        .from("projects")
        .update({ status: "in_progress" })
        .eq("id", projectId)
        .eq("vendor_id", user.id);
    }

    revalidatePath(`/vendor/projects/${projectId}/applicants`);
    revalidatePath(`/vendor/projects/${projectId}/edit`);
    revalidatePath("/vendor/dashboard");
    revalidatePath("/talent/applications");
    revalidatePath(`/talent/projects/${projectId}`);

    return { success: true, error: null };
  } catch (err: unknown) {
    console.error("Error updating applicant status:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat memproses status pelamar.",
    };
  }
}

/**
 * Submit review for a completed application
 * Rule 1: Rating keseluruhan 1-5 bintang (wajib)
 * Rule 2: Kualitas, ketepatan waktu, komunikasi 1-5 (opsional)
 * Rule 3: Komentar (opsional)
 * Rule 4: 1 review per application (cegah duplikat)
 * Rule 5: Hanya vendor pemilik project yang bisa menulis
 */
export async function submitApplicantReview(
  input: ReviewInput
): Promise<{ success: boolean; error: string | null; reviewId?: string }> {
  try {
    const parseResult = reviewSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.issues[0]?.message || "Data penilaian tidak valid.",
      };
    }
    const validated = parseResult.data;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Kamu harus login untuk memberikan penilaian." };
    }

    // Role check: vendor only
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "vendor") {
      return {
        success: false,
        error: "Akses ditolak. Hanya akun Vendor yang dapat memberikan penilaian.",
      };
    }

    // 1. Fetch application and verify project ownership & completed status
    const { data: app, error: appError } = await supabase
      .from("applications")
      .select("id, project_id, talent_id, status, projects(vendor_id)")
      .eq("id", validated.applicationId)
      .maybeSingle();

    if (appError || !app) {
      return { success: false, error: "Data lamaran tidak ditemukan." };
    }

    const p = Array.isArray(app.projects) ? app.projects[0] : app.projects;
    if (!p || p.vendor_id !== user.id) {
      return {
        success: false,
        error: "Kamu tidak memiliki izin untuk menilai lamaran pada proyek vendor lain.",
      };
    }

    if (app.status !== "completed") {
      return {
        success: false,
        error: "Penilaian hanya dapat diberikan setelah proyek/lamaran berstatus 'completed' (selesai).",
      };
    }

    // 2. Prevent duplicate reviews (one review per application)
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("application_id", validated.applicationId)
      .maybeSingle();

    if (existingReview) {
      return {
        success: false,
        error: "Penilaian untuk proyek/lamaran ini sudah pernah diberikan.",
      };
    }

    // 3. Insert review
    const { data: newReview, error: insertError } = await supabase
      .from("reviews")
      .insert({
        application_id: validated.applicationId,
        vendor_id: user.id,
        talent_id: app.talent_id,
        rating: validated.rating,
        quality: validated.quality ?? null,
        timeliness: validated.timeliness ?? null,
        communication: validated.communication ?? null,
        comment: validated.comment ? validated.comment.trim() : null,
      })
      .select("id")
      .single();

    if (insertError || !newReview) {
      console.error("Insert review error:", insertError);
      return {
        success: false,
        error: insertError?.message || "Gagal menyimpan penilaian.",
      };
    }

    // 4. Revalidate all related pages
    revalidatePath(`/vendor/projects/${app.project_id}/applicants`);
    revalidatePath("/vendor/dashboard");
    revalidatePath("/talent/profile");
    revalidatePath("/talent/dashboard");
    revalidatePath("/talent/applications");
    revalidatePath("/talent/projects");

    return { success: true, reviewId: newReview.id, error: null };
  } catch (err: unknown) {
    console.error("Error submitting review:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan penilaian.",
    };
  }
}
