"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calculateMatch, calculateSkillGap, WEIGHTS } from "@/lib/matching";
import {
  evaluateApplicantCvScreening,
  type AiCvScreeningReport,
} from "@/lib/screening/ai-screening";
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
  CvProcessingStatus,
  EducationHistoryItem,
  WorkExperienceItem,
  ScreeningStatus,
} from "@/types/database";
import type { StructuredCvData } from "@/lib/cv/processing";

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
  educationHistory: EducationHistoryItem[];
  workExperience: WorkExperienceItem[];
  bio: string | null;
  location: string | null;
  hoursPerWeek: number | null;
  preferredMode: WorkMode | null;
  isAvailable: boolean;
  portfolioUrls: string[];
  candidateCvName: string | null;
  candidateCvProcessingStatus: CvProcessingStatus | null;
  screeningStatus: ScreeningStatus;
  aiScreening: AiCvScreeningReport;

  // Recalculated deterministic matching with latest data
  latestMatchScore: number;
  textSimilarityScore?: number;
  recommendationScore: number;
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

export interface RecommendedTalentItem {
  talentId: string;
  talentName: string;
  headline: string | null;
  education: string | null;
  location: string | null;
  hoursPerWeek: number | null;
  preferredMode: WorkMode | null;
  isAvailable: boolean;
  hasUploadedCv: boolean;
  matchScore: number;
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
  recommendationSource: string;
}

export interface ProjectApplicantsData {
  project: {
    id: string;
    title: string;
    description: string;
    status: string;
    difficulty: ProjectDifficulty;
    type: ProjectType;
    mode: WorkMode;
    durationWeeks: number | null;
    hoursPerWeek: number | null;
    rewardAmount: number | null;
    rewardNote: string | null;
    deadline: string | null;
    createdAt: string;
    skills: {
      skillId: number;
      name: string;
      category: string;
      minLevel: SkillLevel;
      isRequired: boolean;
    }[];
    evaluationCriteria: {
      name: string;
      weightPercent: number;
      description: string;
    }[];
  };
  applicants: DetailedApplicantItem[];
  recommendedTalents: RecommendedTalentItem[];
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

    // Role & Company membership verification (defense-in-depth)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, platform_role")
      .eq("id", user.id)
      .maybeSingle();

    const { data: rawProject, error: projectError } = await supabase
      .from("projects")
      .select(`
        id,
        vendor_id,
        company_id,
        title,
        description,
        status,
        difficulty,
        type,
        mode,
        duration_weeks,
        hours_per_week,
        reward_amount,
        reward_note,
        deadline,
        created_at,
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
      return { data: null, error: "Lowongan tidak ditemukan." };
    }

    const projectCompanyId = (rawProject as { company_id?: string | null }).company_id ?? null;
    let isAuthorizedCompanyMember = rawProject.vendor_id === user.id && profile?.role === "vendor";

    if (!isAuthorizedCompanyMember && projectCompanyId) {
      const { data: memberRow } = await supabase
        .from("company_members")
        .select("role, status")
        .eq("company_id", projectCompanyId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (memberRow) {
        isAuthorizedCompanyMember = true;
      }
    }

    const isPlatformAdmin =
      (profile as { platform_role?: string } | null)?.platform_role === "platform_admin";

    if (!isAuthorizedCompanyMember && !isPlatformAdmin) {
      return {
        data: null,
        error: "Akses ditolak. Kamu bukan anggota HR aktif dari perusahaan pemilik lowongan ini.",
      };
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

    const projectOverviewSkills = pSkillsList.map((ps) => {
      const sObj = Array.isArray(ps.skills) ? ps.skills[0] : ps.skills;
      return {
        skillId: ps.skill_id,
        name: sObj?.name || `Skill #${ps.skill_id}`,
        category: sObj?.category || "Umum",
        minLevel: ps.min_level,
        isRequired: ps.is_required,
      };
    });

    const evaluationCriteria = [
      {
        name: "Required & Preferred Skills",
        weightPercent: Math.round(WEIGHTS.skill * 100),
        description: "Kesesuaian keahlian kandidat terhadap skill wajib (bobot 1.0) dan opsional (bobot 0.5).",
      },
      {
        name: "Competency Level Fit",
        weightPercent: Math.round(WEIGHTS.levelFit * 100),
        description: "Kecukupan tingkat penguasaan keahlian (Beginner, Intermediate, Advanced) terhadap standar lowongan.",
      },
      {
        name: "Work Mode & Availability",
        weightPercent: Math.round(WEIGHTS.availability * 100),
        description: "Ketersediaan komitmen jam kerja per minggu serta kesesuaian mode kerja (Remote/Onsite/Hybrid).",
      },
      {
        name: "Track Record & Rating",
        weightPercent: Math.round(WEIGHTS.rating * 100),
        description: "Rata-rata penilaian kinerja terdahulu (skor netral cold-start 60% bagi kandidat baru).",
      },
    ];

    const projectContext: ProjectContext = {
      skills: matchingProjectSkills,
      hoursPerWeek: rawProject.hours_per_week,
      mode: rawProject.mode as WorkMode,
    };

    // Helper function to compute Recommended Talent (candidates who have NOT applied to this vacancy)
    const buildRecommendedTalents = async (
      appliedTalentIdSet: ReadonlySet<string>,
    ): Promise<RecommendedTalentItem[]> => {
      if (matchingProjectSkills.length === 0) return [];
      const projectSkillIds = matchingProjectSkills.map((s) => s.skillId);

      // Find talent_skills matching at least one required/preferred skill of this vacancy
      const { data: matchingTalentSkillRows } = await supabase
        .from("talent_skills")
        .select("talent_id, skill_id, level, skills(id, name, category)")
        .in("skill_id", projectSkillIds);

      if (!matchingTalentSkillRows || matchingTalentSkillRows.length === 0) {
        return [];
      }

      const candidateIds = Array.from(
        new Set(
          matchingTalentSkillRows
            .map((r) => r.talent_id as string)
            .filter((tid) => !appliedTalentIdSet.has(tid) && tid !== rawProject.vendor_id),
        ),
      ).slice(0, 15);

      if (candidateIds.length === 0) return [];

      const [recProfilesRes, recTalentProfilesRes, recAllSkillsRes, recRatingsRes] =
        await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", candidateIds),
          supabase
            .from("talent_profiles")
            .select(
              "user_id, headline, education, location, hours_per_week, preferred_mode, is_available, current_cv_id",
            )
            .in("user_id", candidateIds),
          supabase
            .from("talent_skills")
            .select("talent_id, skill_id, level, skills(id, name, category)")
            .in("talent_id", candidateIds),
          supabase
            .from("talent_ratings")
            .select("talent_id, avg_rating")
            .in("talent_id", candidateIds),
        ]);

      const recNameMap = new Map(
        (recProfilesRes.data || []).map((p) => [p.id, p.full_name]),
      );
      const recTpMap = new Map(
        (recTalentProfilesRes.data || []).map((tp) => [tp.user_id, tp]),
      );
      const recRatingMap = new Map(
        (recRatingsRes.data || []).map((r) => [r.talent_id, Number(r.avg_rating)]),
      );

      type RecSkillRow = {
        talent_id: string;
        skill_id: number;
        level: SkillLevel;
        skills:
          | { id: number; name: string; category: string }
          | { id: number; name: string; category: string }[];
      };

      const recSkillsByTalent = new Map<string, MatchingTalentSkill[]>();
      for (const row of (recAllSkillsRes.data || []) as unknown as RecSkillRow[]) {
        const sObj = Array.isArray(row.skills) ? row.skills[0] : row.skills;
        const list = recSkillsByTalent.get(row.talent_id) || [];
        list.push({
          skillId: row.skill_id,
          name: sObj?.name || `Skill #${row.skill_id}`,
          level: row.level,
        });
        recSkillsByTalent.set(row.talent_id, list);
      }

      const recommendations: RecommendedTalentItem[] = candidateIds
        .map((tid) => {
          const tp = recTpMap.get(tid);
          const tSkills = recSkillsByTalent.get(tid) || [];
          const tContext: TalentContext = {
            skills: tSkills,
            hoursPerWeek: tp?.hours_per_week ?? null,
            preferredMode: (tp?.preferred_mode as WorkMode) ?? null,
            isAvailable: tp?.is_available ?? true,
            avgRating: recRatingMap.get(tid) ?? null,
          };

          const match = calculateMatch(tContext, projectContext);
          return {
            talentId: tid,
            talentName: recNameMap.get(tid) || "Kandidat Talenta",
            headline: tp?.headline ?? null,
            education: tp?.education ?? null,
            location: tp?.location ?? null,
            hoursPerWeek: tp?.hours_per_week ?? null,
            preferredMode: (tp?.preferred_mode as WorkMode) ?? null,
            isAvailable: tp?.is_available ?? true,
            hasUploadedCv: Boolean(tp?.current_cv_id),
            matchScore: match.score,
            matchBreakdown: match.breakdown,
            matchedSkills: match.matchedSkills,
            missingSkills: match.missingSkills,
            underLevelSkills: match.underLevelSkills,
            explanation: match.explanation,
            recommendationSource: tp?.current_cv_id
              ? "Profil Terstruktur & CV Terdaftar (Deterministic Criteria Match)"
              : "Profil Keahlian Terstruktur (Deterministic Criteria Match)",
          };
        })
        .filter((item) => item.matchedSkills.length > 0 || item.underLevelSkills.length > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 6);

      return recommendations;
    };

    // 2. Ambil seluruh lamaran aktif untuk proyek ini (kecuali withdrawn)
    const { data: rawApplications, error: appsError } = await supabase
      .from("applications")
      .select("*")
      .eq("project_id", projectId)
      .neq("status", "withdrawn")
      .order("created_at", { ascending: false });

    if (appsError) {
      console.error("Error fetching applications:", appsError);
      return { data: null, error: "Gagal memuat lamaran pelamar." };
    }

    const apps = rawApplications || [];
    const appliedTalentIdSet = new Set(apps.map((a) => a.talent_id as string));
    const recommendedTalents = await buildRecommendedTalents(appliedTalentIdSet);

    const projectOverviewPayload: ProjectApplicantsData["project"] = {
      id: rawProject.id,
      title: rawProject.title,
      description: rawProject.description,
      status: rawProject.status,
      difficulty: rawProject.difficulty,
      type: rawProject.type,
      mode: rawProject.mode,
      durationWeeks: rawProject.duration_weeks ?? null,
      hoursPerWeek: rawProject.hours_per_week,
      rewardAmount: rawProject.reward_amount,
      rewardNote: rawProject.reward_note ?? null,
      deadline: rawProject.deadline,
      createdAt: rawProject.created_at,
      skills: projectOverviewSkills,
      evaluationCriteria,
    };

    if (apps.length === 0) {
      return {
        data: {
          project: projectOverviewPayload,
          applicants: [],
          recommendedTalents,
        },
        error: null,
      };
    }

    const talentIds = apps.map((a) => a.talent_id);

    const appIds = apps.map((a) => a.id);
    const cvIds = apps
      .map((application) => application.candidate_cv_id)
      .filter((cvId): cvId is string => Boolean(cvId));

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

    const [candidateCvsRes, cvExtractionsRes] = await Promise.all([
      cvIds.length > 0
        ? supabase
            .from("candidate_cvs")
            .select("id, original_filename, processing_status")
            .in("id", cvIds)
        : Promise.resolve({ data: [], error: null }),
      cvIds.length > 0
        ? supabase
            .from("candidate_cv_extractions")
            .select("cv_id, extracted_text, structured_data")
            .in("cv_id", cvIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (candidateCvsRes.error) {
      console.error("Fetch applicant CV metadata error:", candidateCvsRes.error);
      return { data: null, error: "Gagal memuat metadata CV pelamar." };
    }

    const candidateCvsMap = new Map(
      (candidateCvsRes.data || []).map((cv) => [cv.id, cv]),
    );

    const cvExtractionsMap = new Map<
      string,
      { extracted_text: string; structured_data: Partial<StructuredCvData> | null }
    >(
      (cvExtractionsRes.data || []).map((ext) => [
        ext.cv_id as string,
        {
          extracted_text: (ext.extracted_text as string) || "",
          structured_data: (ext.structured_data as Partial<StructuredCvData> | null) || null,
        },
      ]),
    );

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

    // 4. Hitung ulang kecocokan deterministik (Deterministic Weighted Scoring, tanpa TF-IDF) untuk setiap pelamar
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
          vendorName: vObj?.organization_name || "Vendor Pathfolio",
        };
      });

      const cvMeta = app.candidate_cv_id ? candidateCvsMap.get(app.candidate_cv_id) : undefined;
      const cvExtraction = app.candidate_cv_id
        ? cvExtractionsMap.get(app.candidate_cv_id)
        : undefined;
      const cvProcStatus = (cvMeta?.processing_status as CvProcessingStatus | undefined) || null;
      let screeningStatus: ScreeningStatus = "completed";
      if (cvProcStatus === "pending") screeningStatus = "queued";
      else if (cvProcStatus === "processing") screeningStatus = "processing";
      else if (cvProcStatus === "failed") screeningStatus = "failed";
      else if (cvProcStatus === "needs_ocr") screeningStatus = "needs_review";

      const aiScreening = evaluateApplicantCvScreening({
        candidateName: prof?.full_name || "Talenta",
        vacancyTitle: rawProject.title,
        deterministicScore: matchResult.score,
        matchBreakdown: matchResult.breakdown,
        projectSkills: matchingProjectSkills.map((ps) => ({
          name: ps.name,
          minLevel: ps.minLevel,
          isRequired: ps.isRequired,
        })),
        matchedSkills: skillGap.matchedSkills,
        missingSkills: skillGap.missingSkills,
        underLevelSkills: skillGap.underLevelSkills,
        profileHeadline: tProf?.headline || null,
        profileEducation: tProf?.education || null,
        profileEducationHistory: tProf?.education_history || [],
        profileWorkExperience: tProf?.work_experience || [],
        extractedCvText: cvExtraction?.extracted_text ?? null,
        structuredCvData: cvExtraction?.structured_data ?? null,
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
        educationHistory: tProf?.education_history || [],
        workExperience: tProf?.work_experience || [],
        bio: tProf?.bio || null,
        location: tProf?.location || null,
        hoursPerWeek: tProf?.hours_per_week ?? null,
        preferredMode: tProf?.preferred_mode ?? null,
        isAvailable: tProf?.is_available ?? true,
        portfolioUrls: tProf?.portfolio_urls || [],
        candidateCvName: cvMeta?.original_filename || null,
        candidateCvProcessingStatus: cvProcStatus,
        screeningStatus,
        aiScreening,
        latestMatchScore: aiScreening.overallScore,
        recommendationScore: aiScreening.overallScore,
        snapshotMatchScore: app.match_score,
        matchBreakdown: {
          skill: aiScreening.criteriaBreakdown.requiredAndPreferredSkillsScore,
          levelFit: aiScreening.criteriaBreakdown.competencyLevelFitScore,
          availability: aiScreening.criteriaBreakdown.workModeAndAvailabilityScore,
          rating: aiScreening.criteriaBreakdown.trackRecordAndCvEvidenceScore,
        },
        matchedSkills: aiScreening.matchedSkills,
        missingSkills: aiScreening.missingSkills,
        underLevelSkills: aiScreening.underLevelSkills,
        explanation: aiScreening.explanation,
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

    // Rank applicants deterministically by weighted criteria score (latestMatchScore)
    applicantsList.sort((a, b) => {
      if (b.latestMatchScore !== a.latestMatchScore) {
        return b.latestMatchScore - a.latestMatchScore;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return {
      data: {
        project: projectOverviewPayload,
        applicants: applicantsList,
        recommendedTalents,
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

    // Try atomic Phase 1 RPC hr_update_application_status first
    const { error: rpcError } = await supabase.rpc("hr_update_application_status", {
      p_application_id: applicationId,
      p_new_status: newStatus,
    });

    if (!rpcError) {
      revalidatePath(`/vendor/projects/${projectId}/applicants`);
      revalidatePath(`/vendor/projects/${projectId}/edit`);
      revalidatePath("/vendor/dashboard");
      revalidatePath("/vendor/applicants");
      revalidatePath("/talent/applications");
      revalidatePath(`/talent/projects/${projectId}`);
      return { success: true, error: null };
    }

    // Fallback if Phase 1 migration RPC hasn't been executed on remote DB yet
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
