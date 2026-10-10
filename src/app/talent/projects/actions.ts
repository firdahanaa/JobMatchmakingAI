"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateMatch } from "@/lib/matching";
import {
  buildProjectTextDocument,
  buildTalentTextDocument,
  combineRecommendationScores,
  rankDocumentsBySimilarity,
} from "@/lib/matching";
import { SKILL_LEVEL_NUMERIC } from "@/lib/matching/types";
import { uuidSchema } from "@/lib/validators/project";
import type {
  TalentContext,
  ProjectContext,
  TalentSkill as MatchingTalentSkill,
  ProjectSkill as MatchingProjectSkill,
  MatchResult,
  SkillLevel,
} from "@/lib/matching/types";
import type {
  WorkMode,
  ProjectDifficulty,
  ProjectType,
} from "@/types/database";

export interface ProjectWithMatch {
  id: string;
  vendorId: string;
  title: string;
  description: string;
  difficulty: ProjectDifficulty;
  type: ProjectType;
  mode: WorkMode;
  durationWeeks: number | null;
  hoursPerWeek: number | null;
  rewardAmount: number | null;
  rewardNote: string | null;
  deadline: string | null;
  status: string;
  createdAt: string;
  vendor: {
    userId: string;
    organizationName: string;
    description: string | null;
    website: string | null;
    location: string | null;
  } | null;
  skills: {
    skillId: number;
    name: string;
    category: string;
    minLevel: SkillLevel;
    isRequired: boolean;
    talentStatus: {
      possessed: boolean;
      talentLevel?: SkillLevel;
      isAdequate: boolean;
    };
  }[];
  matchResult: MatchResult;
  textSimilarityScore?: number;
  recommendationScore?: number;
}

export interface TalentProjectsFilter {
  q?: string;
  difficulty?: string;
  type?: string;
  mode?: string;
  sort?: "match" | "newest" | "deadline" | string;
}

export interface GetTalentProjectsResult {
  projects: ProjectWithMatch[];
  totalOpenProjects: number;
  hasConfiguredSkills: boolean;
  talentAvailable: boolean;
  error: string | null;
}

type RawProjectSkill = {
  project_id: string;
  skill_id: number;
  min_level: SkillLevel;
  is_required: boolean;
  skills: { id: number; name: string; category: string } | { id: number; name: string; category: string }[];
};

type RawVendor = {
  user_id: string;
  organization_name: string;
  description: string | null;
  website: string | null;
  location: string | null;
};

type RawProject = {
  id: string;
  vendor_id: string;
  title: string;
  description: string;
  difficulty: ProjectDifficulty;
  type: ProjectType;
  mode: WorkMode;
  duration_weeks: number | null;
  hours_per_week: number | null;
  reward_amount: number | null;
  reward_note: string | null;
  deadline: string | null;
  status: string;
  created_at: string;
  vendor_profiles?: RawVendor | RawVendor[] | null;
  project_skills?: RawProjectSkill[] | null;
};

/**
 * Helper to fetch talent context for matching (Anti N+1 query: executed once per request)
 */
export async function getTalentMatchingContext(): Promise<{
  context: TalentContext | null;
  userId: string | null;
  hasConfiguredSkills: boolean;
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
        context: null,
        userId: null,
        hasConfiguredSkills: false,
        error: "Sesi login telah berakhir. Silakan login kembali.",
      };
    }

    // 1 query batch paralel untuk talent profile, skills, dan rating
    const [profileRes, skillsRes, ratingRes] = await Promise.all([
      supabase
        .from("talent_profiles")
        .select("headline, bio, hours_per_week, preferred_mode, is_available")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("talent_skills")
        .select("skill_id, level, skills(id, name, category)")
        .eq("talent_id", user.id),
      supabase
        .from("talent_ratings")
        .select("avg_rating")
        .eq("talent_id", user.id)
        .maybeSingle(),
    ]);

    type SkillJoinItem = {
      skill_id: number;
      level: SkillLevel;
      skills: { id: number; name: string; category: string } | { id: number; name: string; category: string }[];
    };

    const skillRows = (skillsRes.data || []) as unknown as SkillJoinItem[];
    const matchingSkills: MatchingTalentSkill[] = skillRows.map((row) => {
      const skillObj = Array.isArray(row.skills) ? row.skills[0] : row.skills;
      return {
        skillId: row.skill_id,
        name: skillObj?.name || `Skill #${row.skill_id}`,
        level: row.level,
      };
    });

    const talentProfile = profileRes.data;
    const avgRatingVal =
      ratingRes.data?.avg_rating != null ? Number(ratingRes.data.avg_rating) : null;

    const talentContext: TalentContext = {
      skills: matchingSkills,
      headline: talentProfile?.headline ?? null,
      bio: talentProfile?.bio ?? null,
      hoursPerWeek: talentProfile?.hours_per_week ?? null,
      preferredMode: (talentProfile?.preferred_mode as WorkMode) ?? null,
      isAvailable: talentProfile?.is_available ?? true,
      avgRating: avgRatingVal,
    };

    return {
      context: talentContext,
      userId: user.id,
      hasConfiguredSkills: matchingSkills.length > 0,
      error: null,
    };
  } catch (err: unknown) {
    console.error("Error fetching talent context:", err);
    return {
      context: null,
      userId: null,
      hasConfiguredSkills: false,
      error: err instanceof Error ? err.message : "Gagal memuat profil talent.",
    };
  }
}

/**
 * Fetch all open projects with vendor and skills in a single query (Anti N+1)
 * and calculate match scores for the logged in talent.
 */
export async function getTalentProjects(
  filter: TalentProjectsFilter = {}
): Promise<GetTalentProjectsResult> {
  try {
    const { context: talentContext, error: contextError, hasConfiguredSkills } =
      await getTalentMatchingContext();

    if (contextError || !talentContext) {
      return {
        projects: [],
        totalOpenProjects: 0,
        hasConfiguredSkills: false,
        talentAvailable: true,
        error: contextError || "Autentikasi gagal.",
      };
    }

    const supabase = await createClient();

    // Query 1 tunggal untuk seluruh proyek open + vendor profile + project skills
    const { data: rawProjects, error: projectsError } = await supabase
      .from("projects")
      .select(`
        id,
        vendor_id,
        title,
        description,
        difficulty,
        type,
        mode,
        duration_weeks,
        hours_per_week,
        reward_amount,
        reward_note,
        deadline,
        status,
        created_at,
        vendor_profiles:vendor_id (
          user_id,
          organization_name,
          description,
          website,
          location
        ),
        project_skills (
          project_id,
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
      .eq("status", "open");

    if (projectsError) {
      console.error("Error fetching projects for talent:", projectsError);
      return {
        projects: [],
        totalOpenProjects: 0,
        hasConfiguredSkills,
        talentAvailable: talentContext.isAvailable,
        error: "Gagal memuat daftar proyek dari database.",
      };
    }

    // Lookup map talent skills for fast per-skill match indicator
    const talentSkillsMap = new Map<number | string, MatchingTalentSkill>();
    for (const ts of talentContext.skills) {
      talentSkillsMap.set(ts.skillId, ts);
      talentSkillsMap.set(ts.name.toLowerCase().trim(), ts);
    }

    const projectsList = (rawProjects || []) as unknown as RawProject[];
    const totalOpenProjects = projectsList.length;
    const talentDocument = buildTalentTextDocument(talentContext);
    const similarityByProjectId = new Map(
      rankDocumentsBySimilarity(
        talentDocument,
        projectsList.map((project) => ({
          id: project.id,
          text: buildProjectTextDocument({
            title: project.title,
            description: project.description,
            skills: (project.project_skills || []).map((skill) => {
              const skillObject = Array.isArray(skill.skills) ? skill.skills[0] : skill.skills;
              return { name: skillObject?.name || `Skill #${skill.skill_id}` };
            }),
          }),
        }))
      ).map(({ id, similarity }) => [id, similarity])
    );

    // Hitung calculateMatch untuk tiap proyek
    const mappedProjects: ProjectWithMatch[] = projectsList.map((p) => {
      const vendorObj = Array.isArray(p.vendor_profiles)
        ? p.vendor_profiles[0]
        : p.vendor_profiles;

      const pSkills: RawProjectSkill[] = p.project_skills || [];

      const matchingProjectSkills: MatchingProjectSkill[] = pSkills.map((ps) => {
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
        hoursPerWeek: p.hours_per_week,
        mode: p.mode,
      };

      const matchResult = calculateMatch(talentContext, projectContext);
      const textSimilarity = similarityByProjectId.get(p.id) ?? 0;

      // Detail skill proyek dengan indikator kepemilikan talent
      const enrichedSkills = pSkills.map((ps) => {
        const sObj = Array.isArray(ps.skills) ? ps.skills[0] : ps.skills;
        const skillName = sObj?.name || `Skill #${ps.skill_id}`;
        const talentSkill =
          talentSkillsMap.get(ps.skill_id) ??
          talentSkillsMap.get(skillName.toLowerCase().trim());

        const possessed = !!talentSkill;
        const isAdequate =
          possessed &&
          SKILL_LEVEL_NUMERIC[talentSkill.level] >= SKILL_LEVEL_NUMERIC[ps.min_level];

        return {
          skillId: ps.skill_id,
          name: skillName,
          category: sObj?.category || "Umum",
          minLevel: ps.min_level,
          isRequired: ps.is_required,
          talentStatus: {
            possessed,
            talentLevel: talentSkill?.level,
            isAdequate,
          },
        };
      });

      return {
        id: p.id,
        vendorId: p.vendor_id,
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        type: p.type,
        mode: p.mode,
        durationWeeks: p.duration_weeks,
        hoursPerWeek: p.hours_per_week,
        rewardAmount: p.reward_amount,
        rewardNote: p.reward_note,
        deadline: p.deadline,
        status: p.status,
        createdAt: p.created_at,
        vendor: vendorObj
          ? {
              userId: vendorObj.user_id,
              organizationName: vendorObj.organization_name || "Organisasi Vendor",
              description: vendorObj.description,
              website: vendorObj.website,
              location: vendorObj.location,
            }
          : null,
        skills: enrichedSkills,
        matchResult,
        textSimilarityScore: Math.round(textSimilarity * 100),
        recommendationScore: combineRecommendationScores(matchResult.score, textSimilarity),
      };
    });

    // Terapkan Filter
    let filtered = mappedProjects;

    // 1. Text search (q): cocok dengan judul proyek atau nama skill
    if (filter.q && filter.q.trim().length > 0) {
      const q = filter.q.toLowerCase().trim();
      filtered = filtered.filter((p) => {
        const titleMatch = p.title.toLowerCase().includes(q);
        const skillMatch = p.skills.some((s) => s.name.toLowerCase().includes(q));
        const vendorMatch = p.vendor?.organizationName.toLowerCase().includes(q);
        return titleMatch || skillMatch || vendorMatch;
      });
    }

    // 2. Filter Difficulty
    if (filter.difficulty && filter.difficulty !== "all") {
      filtered = filtered.filter((p) => p.difficulty === filter.difficulty);
    }

    // 3. Filter Type (freelance / volunteer)
    if (filter.type && filter.type !== "all") {
      filtered = filtered.filter((p) => p.type === filter.type);
    }

    // 4. Filter Mode (remote / onsite / hybrid)
    if (filter.mode && filter.mode !== "all") {
      filtered = filtered.filter((p) => p.mode === filter.mode);
    }

    // Urutkan (Sorting): default adalah match score tertinggi
    const sort = filter.sort || "match";
    filtered.sort((a, b) => {
      if (sort === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sort === "deadline") {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      // default: "match" (Match Score Tertinggi)
      const scoreDifference =
        (b.recommendationScore ?? b.matchResult.score) -
        (a.recommendationScore ?? a.matchResult.score);
      if (scoreDifference !== 0) {
        return scoreDifference;
      }
      // Jika skor sama, dahulukan yang lebih baru dibuat
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return {
      projects: filtered,
      totalOpenProjects,
      hasConfiguredSkills,
      talentAvailable: talentContext.isAvailable,
      error: null,
    };
  } catch (err: unknown) {
    console.error("Error in getTalentProjects:", err);
    return {
      projects: [],
      totalOpenProjects: 0,
      hasConfiguredSkills: false,
      talentAvailable: true,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat memproses data proyek.",
    };
  }
}

/**
 * Fetch a single project detail with full matching breakdown for talent
 */
export async function getTalentProjectDetail(projectId: string): Promise<{
  project: ProjectWithMatch | null;
  error: string | null;
}> {
  try {
    const idValidation = uuidSchema.safeParse(projectId);
    if (!idValidation.success) {
      return { project: null, error: "ID proyek tidak valid." };
    }

    const { context: talentContext, error: contextError } =
      await getTalentMatchingContext();

    if (contextError || !talentContext) {
      return { project: null, error: contextError || "Autentikasi gagal." };
    }

    const supabase = await createClient();

    const { data: rawProject, error: projectError } = await supabase
      .from("projects")
      .select(`
        id,
        vendor_id,
        title,
        description,
        difficulty,
        type,
        mode,
        duration_weeks,
        hours_per_week,
        reward_amount,
        reward_note,
        deadline,
        status,
        created_at,
        vendor_profiles:vendor_id (
          user_id,
          organization_name,
          description,
          website,
          location
        ),
        project_skills (
          project_id,
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
      return { project: null, error: "Proyek tidak ditemukan atau telah ditutup." };
    }

    const p = rawProject as unknown as RawProject;

    const vendorObj = Array.isArray(p.vendor_profiles)
      ? p.vendor_profiles[0]
      : p.vendor_profiles;

    const pSkills: RawProjectSkill[] = p.project_skills || [];

    const talentSkillsMap = new Map<number | string, MatchingTalentSkill>();
    for (const ts of talentContext.skills) {
      talentSkillsMap.set(ts.skillId, ts);
      talentSkillsMap.set(ts.name.toLowerCase().trim(), ts);
    }

    const matchingProjectSkills: MatchingProjectSkill[] = pSkills.map((ps) => {
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
      hoursPerWeek: p.hours_per_week,
      mode: p.mode,
    };

    const matchResult = calculateMatch(talentContext, projectContext);

    const enrichedSkills = pSkills.map((ps) => {
      const sObj = Array.isArray(ps.skills) ? ps.skills[0] : ps.skills;
      const skillName = sObj?.name || `Skill #${ps.skill_id}`;
      const talentSkill =
        talentSkillsMap.get(ps.skill_id) ??
        talentSkillsMap.get(skillName.toLowerCase().trim());

      const possessed = !!talentSkill;
      const isAdequate =
        possessed &&
        SKILL_LEVEL_NUMERIC[talentSkill.level] >= SKILL_LEVEL_NUMERIC[ps.min_level as SkillLevel];

      return {
        skillId: ps.skill_id,
        name: skillName,
        category: sObj?.category || "Umum",
        minLevel: ps.min_level as SkillLevel,
        isRequired: ps.is_required,
        talentStatus: {
          possessed,
          talentLevel: talentSkill?.level,
          isAdequate,
        },
      };
    });

    const projectWithMatch: ProjectWithMatch = {
      id: p.id,
      vendorId: p.vendor_id,
      title: p.title,
      description: p.description,
      difficulty: p.difficulty,
      type: p.type,
      mode: p.mode,
      durationWeeks: p.duration_weeks,
      hoursPerWeek: p.hours_per_week,
      rewardAmount: p.reward_amount,
      rewardNote: p.reward_note,
      deadline: p.deadline,
      status: p.status,
      createdAt: p.created_at,
      vendor: vendorObj
        ? {
            userId: vendorObj.user_id,
            organizationName: vendorObj.organization_name || "Organisasi Vendor",
            description: vendorObj.description,
            website: vendorObj.website,
            location: vendorObj.location,
          }
        : null,
      skills: enrichedSkills,
      matchResult,
    };

    return { project: projectWithMatch, error: null };
  } catch (err: unknown) {
    console.error("Error in getTalentProjectDetail:", err);
    return {
      project: null,
      error: err instanceof Error ? err.message : "Gagal memuat rincian proyek.",
    };
  }
}
