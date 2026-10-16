import type { ProjectDifficulty, ProjectType, WorkMode } from "@/types/database";
import type { SkillLevel } from "@/lib/matching/types";
import type { ProjectWithMatch } from "@/app/talent/projects/actions";

/**
 * Talent-facing project type: match score, breakdown, talentStatus, and
 * recommendation scores are intentionally omitted so they are never
 * serialized across the server→client boundary.
 */
export interface ProjectForTalent {
  id: string;
  vendorId: string;
  title: string;
  description: string;
  difficulty: ProjectDifficulty;
  type: ProjectType;
  mode: WorkMode;
  durationWeeks: number | null;
  hoursPerWeek: number | null;
  paymentEnabled: boolean;
  portfolioRequired: boolean;
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
  /** Skills list without match/gap indicators — safe for talent-facing renders. */
  skills: {
    skillId: number;
    name: string;
    category: string;
    minLevel: SkillLevel;
    isRequired: boolean;
  }[];
}

/**
 * Strip all match-score fields from a ProjectWithMatch before any
 * server→client serialization boundary.
 *
 * Sorting / ordering by match score is performed server-side before calling
 * this function, so relevance ordering is preserved.
 */
export function sanitizeProjectForTalent(
  p: ProjectWithMatch | ProjectForTalent
): ProjectForTalent {
  return {
    id: p.id,
    vendorId: p.vendorId,
    title: p.title,
    description: p.description,
    difficulty: p.difficulty,
    type: p.type,
    mode: p.mode,
    durationWeeks: p.durationWeeks,
    hoursPerWeek: p.hoursPerWeek,
    paymentEnabled: p.paymentEnabled,
    portfolioRequired: p.portfolioRequired,
    rewardAmount: p.rewardAmount,
    rewardNote: p.rewardNote,
    deadline: p.deadline,
    status: p.status,
    createdAt: p.createdAt,
    vendor: p.vendor,
    skills: p.skills.map(({ skillId, name, category, minLevel, isRequired }) => ({
      skillId,
      name,
      category,
      minLevel,
      isRequired,
    })),
  };
}
